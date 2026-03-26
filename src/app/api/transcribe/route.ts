import { NextRequest, NextResponse } from "next/server"
import { spawn, execFile, type ChildProcess } from "child_process"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const TRANSCRIPTS_DIR = path.join(DATA_DIR, "transcripts")
const AUDIO_DIR = path.join(TRANSCRIPTS_DIR, "audio")
const WORKER_SCRIPT = path.join(process.cwd(), "scripts", "transcribe_worker.py")
const PYTHON = process.env.PYTHON_PATH || "python3"
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg"
const HF_TOKEN = process.env.HF_TOKEN || ""
const MAX_AUDIO_SIZE = 50 * 1024 * 1024 // 50MB

// --- Worker result ---
interface WorkerResult {
  ok: boolean
  text?: string
  segments?: Array<{ start: number; end: number; text: string; speaker: string }>
  elapsed?: number
  diarized?: boolean
  error?: string
}

const WORKER_IDLE_MS = 5 * 60 * 1000 // 5 dakika inaktifse kapat

// --- Persistent worker via globalThis (survives Next.js hot-reload) ---
const g = globalThis as unknown as {
  __whisperWorker?: ChildProcess | null
  __whisperReady?: boolean
  __whisperQueue?: Array<{ resolve: (r: WorkerResult) => void }>
  __whisperBuffer?: string
  __whisperTimeout?: ReturnType<typeof setTimeout> | null
  __whisperIdleTimer?: ReturnType<typeof setTimeout> | null
}

function getWorkerState() {
  if (!g.__whisperQueue) g.__whisperQueue = []
  if (!g.__whisperBuffer) g.__whisperBuffer = ""
  return {
    get worker() { return g.__whisperWorker ?? null },
    set worker(w) { g.__whisperWorker = w },
    get ready() { return g.__whisperReady ?? false },
    set ready(r) { g.__whisperReady = r },
    get queue() { return g.__whisperQueue! },
    get buffer() { return g.__whisperBuffer! },
    set buffer(b) { g.__whisperBuffer = b },
  }
}

function resetIdleTimer() {
  if (g.__whisperIdleTimer) clearTimeout(g.__whisperIdleTimer)
  g.__whisperIdleTimer = setTimeout(() => {
    const s = getWorkerState()
    if (s.worker && s.queue.length === 0) {
      console.log("[transcribe] Worker idle timeout — shutting down")
      killExistingWorker()
    }
  }, WORKER_IDLE_MS)
}

function killExistingWorker() {
  const s = getWorkerState()
  if (s.worker) {
    try { s.worker.kill() } catch { /* ignore */ }
    s.worker = null
    s.ready = false
    // Reject pending
    for (const item of s.queue) {
      item.resolve({ ok: false, error: "Worker restarted" })
    }
    s.queue.length = 0
    s.buffer = ""
  }
}

function ensureWorker(): Promise<void> {
  const s = getWorkerState()

  if (s.worker && s.ready && !s.worker.killed) {
    return Promise.resolve()
  }

  // Kill any existing broken worker
  killExistingWorker()

  return new Promise((resolve, reject) => {
    console.log("[transcribe] Spawning new worker...")

    const proc = spawn(PYTHON, [WORKER_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, HF_TOKEN, TOKENIZERS_PARALLELISM: "false" },
    })

    s.worker = proc
    s.ready = false
    s.buffer = ""

    proc.stderr?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n")
      for (const line of lines) {
        const msg = line.trim()
        if (!msg) continue
        console.log(`[transcribe-worker] ${msg}`)
        if (msg === "READY") {
          s.ready = true
          resetIdleTimer()
          resolve()
        }
      }
    })

    proc.stdout?.on("data", (data: Buffer) => {
      s.buffer += data.toString()
      const lines = s.buffer.split("\n")
      s.buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const result = JSON.parse(line) as WorkerResult
          const pending = s.queue.shift()
          if (pending) pending.resolve(result)
          resetIdleTimer()
        } catch {
          console.error("[transcribe] Failed to parse worker output:", line.slice(0, 100))
        }
      }
    })

    proc.on("exit", (code) => {
      console.log(`[transcribe] Worker exited with code ${code}`)
      s.worker = null
      s.ready = false
      for (const item of s.queue) {
        item.resolve({ ok: false, error: "Worker crashed" })
      }
      s.queue.length = 0
    })

    proc.on("error", (err) => {
      console.error("[transcribe] Worker spawn error:", err.message)
      s.worker = null
      s.ready = false
      reject(err)
    })

    // 120s timeout for initial model load
    setTimeout(() => {
      if (!s.ready) {
        killExistingWorker()
        reject(new Error("Worker startup timeout"))
      }
    }, 120000)
  })
}

function sendToWorker(cmd: Record<string, unknown>): Promise<WorkerResult> {
  const s = getWorkerState()

  return new Promise((resolve) => {
    // Timeout per request: 10 minutes (large-v3 + align + diarize on 2min audio)
    const timer = setTimeout(() => {
      resolve({ ok: false, error: "Transkripsiyon zaman aşımı (10dk)" })
    }, 600000)

    s.queue.push({
      resolve: (result) => {
        clearTimeout(timer)
        resolve(result)
      },
    })

    s.worker?.stdin?.write(JSON.stringify(cmd) + "\n")
  })
}

// --- ffmpeg ---
async function convertToWav(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(FFMPEG, [
      "-i", inputPath,
      "-ar", "16000", "-ac", "1", "-f", "wav", "-y",
      outputPath,
    ], { timeout: 30000 }, (err, _stdout, stderr) => {
      if (err) {
        console.error("[transcribe] ffmpeg error:", stderr?.slice(0, 200))
        reject(err)
      } else resolve()
    })
  })
}

// --- POST ---
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audio = formData.get("audio") as File | null
    const danisanId = formData.get("danisanId") as string | null
    const danisanAd = formData.get("danisanAd") as string | null
    const sessionDate = formData.get("sessionDate") as string | null
    const chunkNo = parseInt(formData.get("chunkNo") as string ?? "0", 10)

    if (!audio || !danisanId || !sessionDate) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    if (!HF_TOKEN) {
      return NextResponse.json({ error: "HF_TOKEN not configured" }, { status: 500 })
    }

    // File base: "MustafaC_2026-03-25"
    const safeName = (danisanAd ?? danisanId).replace(/[^a-zA-Z0-9\-_]/g, "")
    const fileBase = `${safeName}_${sessionDate}`

    await fs.mkdir(AUDIO_DIR, { recursive: true })

    const buffer = Buffer.from(await audio.arrayBuffer())

    if (buffer.length > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: "Dosya boyutu 50MB sınırını aşıyor" }, { status: 413 })
    }
    const ext = audio.name?.split(".").pop() ?? "webm"
    const inputPath = path.join(AUDIO_DIR, `chunk_${danisanId}_${chunkNo}.${ext}`)
    const wavPath = path.join(AUDIO_DIR, `chunk_${danisanId}_${chunkNo}.wav`)
    await fs.writeFile(inputPath, buffer)

    console.log(`[transcribe] Chunk ${chunkNo}: ${buffer.length} bytes (${ext}), converting...`)

    // Convert to wav
    try {
      await convertToWav(inputPath, wavPath)
      console.log(`[transcribe] Chunk ${chunkNo}: wav conversion OK`)
    } catch {
      if (ext === "wav") {
        await fs.copyFile(inputPath, wavPath)
      } else {
        await fs.unlink(inputPath).catch(() => {})
        return NextResponse.json({ error: `Ses formatı dönüştürülemedi (${ext})` }, { status: 500 })
      }
    }

    // Start worker
    await ensureWorker()

    console.log(`[transcribe] Chunk ${chunkNo}: sending to worker...`)
    const result = await sendToWorker({ path: wavPath, min_speakers: 2, max_speakers: 2 })
    console.log(`[transcribe] Chunk ${chunkNo}: worker responded, ok=${result.ok}, elapsed=${result.elapsed}s`)

    // Cleanup temp files
    await fs.unlink(inputPath).catch(() => {})
    await fs.unlink(wavPath).catch(() => {})

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Transcription failed" }, { status: 500 })
    }

    // Append to transcript file
    const transcriptPath = path.join(TRANSCRIPTS_DIR, `${fileBase}.txt`)
    const exists = await fs.access(transcriptPath).then(() => true).catch(() => false)

    if (!exists) {
      const header = `# Seans Transkripti\n# Danışan: ${danisanAd ?? danisanId}\n# Tarih: ${sessionDate}\n# Psikolog: Uzm. Kl. Psk. Yusuf Pamuk\n---\n\n`
      await fs.writeFile(transcriptPath, header, "utf-8")
    }

    // Format with timestamps — each chunk is ~2 minutes
    const chunkMinutes = chunkNo * 2
    const now = new Date()
    const clock = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })

    let appendText = `[${clock} — kayıt dk ${chunkMinutes}-${chunkMinutes + 2}]\n`
    if (result.segments && result.segments.length > 0) {
      for (const seg of result.segments) {
        const speaker = seg.speaker && seg.speaker !== "UNKNOWN" ? `${seg.speaker}: ` : ""
        appendText += `${speaker}${seg.text}\n`
      }
    } else if (result.text) {
      appendText += `${result.text}\n`
    }
    appendText += "\n"
    await fs.appendFile(transcriptPath, appendText, "utf-8")

    console.log(`[transcribe] Chunk ${chunkNo}: transcript appended`)

    return NextResponse.json({
      ok: true,
      text: result.text,
      segments: result.segments,
      chunkNo,
      elapsed: result.elapsed,
      diarized: result.diarized,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[transcribe] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// --- GET ---
export async function GET(request: NextRequest) {
  const fileBase = request.nextUrl.searchParams.get("fileBase")
  if (!fileBase) return NextResponse.json({ error: "Missing fileBase" }, { status: 400 })

  let transcript = ""
  let insight = ""
  try { transcript = await fs.readFile(path.join(TRANSCRIPTS_DIR, `${fileBase}.txt`), "utf-8") } catch { /* */ }
  try { insight = await fs.readFile(path.join(TRANSCRIPTS_DIR, `${fileBase}_insight.md`), "utf-8") } catch { /* */ }

  return NextResponse.json({ transcript, insight })
}

// --- DELETE ---
export async function DELETE(request: NextRequest) {
  const fileBase = request.nextUrl.searchParams.get("fileBase")
  if (!fileBase) return NextResponse.json({ error: "Missing fileBase" }, { status: 400 })

  await fs.unlink(path.join(TRANSCRIPTS_DIR, `${fileBase}.txt`)).catch(() => {})
  await fs.unlink(path.join(TRANSCRIPTS_DIR, `${fileBase}_insight.md`)).catch(() => {})

  return NextResponse.json({ ok: true })
}
