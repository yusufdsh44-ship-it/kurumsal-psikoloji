import { NextResponse } from "next/server"
import { watch, type FSWatcher } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const JSON_FILES = ["danisanlar.json", "mudurlukler.json", "testSonuclari.json", "seansPlanlari.json", "gorusmeNotlari.json"]

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial ping
      controller.enqueue(encoder.encode("data: connected\n\n"))

      const watchers: FSWatcher[] = []

      for (const file of JSON_FILES) {
        try {
          const filePath = path.join(DATA_DIR, file)
          const w = watch(filePath, (eventType) => {
            if (eventType === "change") {
              const collection = file.replace(".json", "")
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ collection, time: Date.now() })}\n\n`))
              } catch {
                // Stream closed
              }
            }
          })
          watchers.push(w)
        } catch {
          // File doesn't exist yet, skip
        }
      }

      // Also watch raporlar directory
      try {
        const raporDir = path.join(DATA_DIR, "raporlar")
        const w = watch(raporDir, (eventType, filename) => {
          if (filename?.endsWith(".md")) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ collection: "rapor", slug: filename.replace(".md", ""), time: Date.now() })}\n\n`))
            } catch {
              // Stream closed
            }
          }
        })
        watchers.push(w)
      } catch {
        // Dir doesn't exist yet
      }

      // Watch transcripts directory (transkript + Cowork insight files)
      try {
        const transcriptsDir = path.join(DATA_DIR, "transcripts")
        const w = watch(transcriptsDir, (eventType, filename) => {
          if (filename && (filename.endsWith(".txt") || filename.endsWith("_insight.md"))) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ collection: "transcript", file: filename, time: Date.now() })}\n\n`))
            } catch {
              // Stream closed
            }
          }
        })
        watchers.push(w)
      } catch {
        // Dir doesn't exist yet
      }

      // Keep-alive ping every 30s
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"))
        } catch {
          clearInterval(pingInterval)
        }
      }, 30000)

      // Cleanup on cancel
      const cleanup = () => {
        clearInterval(pingInterval)
        watchers.forEach(w => w.close())
      }

      // Store cleanup for when the stream is cancelled
      ;(controller as unknown as { _cleanup: () => void })._cleanup = cleanup
    },
    cancel(controller) {
      const c = controller as unknown as { _cleanup?: () => void }
      c._cleanup?.()
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
