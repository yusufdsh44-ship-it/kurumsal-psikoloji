"use client"

import { useState, useRef, useCallback, useEffect } from "react"

type RecorderStatus = "idle" | "recording" | "processing" | "paused"

interface RecorderState {
  status: RecorderStatus
  transcript: string
  insight: string
  error: string | null
  chunkCount: number
}

interface ActiveSessionInfo {
  danisanId: string
  adSoyad: string
  sicilNo: number
  mudurluk: string
  kseKademe: string | null
  bfiKademe: string | null
  gsiSkoru: number | null
  transkriptDosya: string
  insightDosya: string
  baslamaSaati: string
}

const CHUNK_DURATION = 120000 // 2 minutes — longer chunks = better diarization

export function useAudioRecorder(danisanId: string, danisanAd: string, sessionDate: string, seansNo: number, sessionInfo?: ActiveSessionInfo) {
  const [state, setState] = useState<RecorderState>({
    status: "idle",
    transcript: "",
    insight: "",
    error: null,
    chunkCount: 0,
  })

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const chunkNoRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeRef = useRef(false) // tracks if session is active (recording or paused)

  // Dosya adı: "ElifT_2026-03-25_S1.txt" formatında
  const safeName = danisanAd.replace(/\s+/g, "").replace(/\./g, "")
  const fileBase = `${safeName}_${sessionDate}_S${seansNo}`
  const transcriptFile = `data/transcripts/${fileBase}.txt`
  const insightFile = `data/transcripts/${fileBase}_insight.md`

  // --- Active session ---
  const writeActiveSession = useCallback(async () => {
    if (!sessionInfo) return
    try {
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sessionInfo, transkriptDosya: transcriptFile, insightDosya: insightFile }),
      })
    } catch { /* ignore */ }
  }, [sessionInfo, transcriptFile, insightFile])

  const clearActiveSession = useCallback(async () => {
    try { await fetch("/api/session", { method: "DELETE" }) } catch { /* ignore */ }
  }, [])

  // --- Polling ---
  const pollTranscript = useCallback(async () => {
    try {
      const res = await fetch(`/api/transcribe?fileBase=${fileBase}`)
      if (!res.ok) return
      const data = await res.json()
      setState(prev => ({
        ...prev,
        transcript: data.transcript || prev.transcript,
        insight: data.insight || prev.insight,
      }))
    } catch { /* ignore */ }
  }, [fileBase])

  // Poll on mount for existing data
  useEffect(() => { pollTranscript() }, [pollTranscript])

  // --- Send completed recording blob ---
  const sendBlob = useCallback(async (blob: Blob) => {
    const chunkNo = chunkNoRef.current++
    try {
      const formData = new FormData()
      // Always send as .wav — we'll convert in the hook before sending
      formData.append("audio", blob, `chunk_${chunkNo}.wav`)
      formData.append("danisanId", danisanId)
      formData.append("danisanAd", danisanAd)
      formData.append("sessionDate", sessionDate)
      formData.append("chunkNo", String(chunkNo))

      const res = await fetch("/api/transcribe", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setState(prev => ({ ...prev, error: data.error ?? "Transkripsiyon hatası" }))
        return
      }

      await pollTranscript()
      setState(prev => ({ ...prev, chunkCount: chunkNo + 1, error: null }))
    } catch (e) {
      setState(prev => ({ ...prev, error: e instanceof Error ? e.message : "Bağlantı hatası" }))
    }
  }, [danisanId, sessionDate, pollTranscript])

  // --- Create a new MediaRecorder, record for CHUNK_DURATION, then send ---
  const recordOneChunk = useCallback(async () => {
    if (!streamRef.current || !activeRef.current) return

    const stream = streamRef.current
    chunksRef.current = []

    const recorder = new MediaRecorder(stream)
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        sendBlob(blob)
      }
      // Schedule next chunk if still active
      if (activeRef.current && streamRef.current) {
        timerRef.current = setTimeout(recordOneChunk, 200) // small gap between chunks
      }
    }

    recorder.start()

    // Stop after CHUNK_DURATION to produce a complete, valid file
    timerRef.current = setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop()
      }
    }, CHUNK_DURATION)
  }, [sendBlob])

  // --- Start recording ---
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      activeRef.current = true
      chunkNoRef.current = 0

      setState(prev => ({ ...prev, status: "recording", error: null, chunkCount: 0 }))

      await writeActiveSession()

      // Start polling
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(pollTranscript, 5000)

      // Record first chunk
      recordOneChunk()
    } catch (e) {
      setState(prev => ({ ...prev, error: e instanceof Error ? e.message : "Mikrofon erişimi reddedildi" }))
    }
  }, [recordOneChunk, pollTranscript, writeActiveSession])

  // --- Pause ---
  const pauseRecording = useCallback(() => {
    activeRef.current = false
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    const recorder = recorderRef.current
    if (recorder && recorder.state === "recording") {
      recorder.stop() // triggers onstop → sends last chunk
    }
    setState(prev => ({ ...prev, status: "paused" }))
  }, [])

  // --- Resume ---
  const resumeRecording = useCallback(() => {
    if (!streamRef.current || !streamRef.current.active) {
      // Stream was killed, need new one
      startRecording()
      return
    }
    activeRef.current = true
    setState(prev => ({ ...prev, status: "recording", error: null }))
    recordOneChunk()
  }, [startRecording, recordOneChunk])

  // --- Save & finish ---
  const saveRecording = useCallback(async () => {
    activeRef.current = false
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }

    const recorder = recorderRef.current
    if (recorder && recorder.state === "recording") recorder.stop()

    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    recorderRef.current = null

    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }

    await new Promise(r => setTimeout(r, 2000))
    await pollTranscript()
    await clearActiveSession()
    setState(prev => ({ ...prev, status: "idle" }))
  }, [pollTranscript, clearActiveSession])

  // --- Discard ---
  const discardRecording = useCallback(async () => {
    activeRef.current = false
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }

    const recorder = recorderRef.current
    if (recorder && recorder.state === "recording") {
      recorder.ondataavailable = null // don't send
      recorder.onstop = null
      recorder.stop()
    }

    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    recorderRef.current = null

    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }

    try {
      await fetch(`/api/transcribe?fileBase=${fileBase}`, { method: "DELETE" })
    } catch { /* ignore */ }
    await clearActiveSession()
    setState({ status: "idle", transcript: "", insight: "", error: null, chunkCount: 0 })
  }, [fileBase, clearActiveSession])

  // Cleanup
  useEffect(() => {
    return () => {
      activeRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  return {
    ...state,
    isIdle: state.status === "idle",
    isRecording: state.status === "recording",
    isPaused: state.status === "paused",
    isActive: state.status !== "idle",
    startRecording,
    pauseRecording,
    resumeRecording,
    saveRecording,
    discardRecording,
    transcriptFile,
    insightFile,
  }
}
