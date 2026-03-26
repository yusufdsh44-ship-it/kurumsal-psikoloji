"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

export function useFileSync() {
  const qc = useQueryClient()
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let es: EventSource | null = null
    let mounted = true

    function connect() {
      if (!mounted) return

      es = new EventSource("/api/watch")

      es.onmessage = (event) => {
        if (event.data === "connected") return

        try {
          const payload = JSON.parse(event.data)

          if (payload.collection === "rapor") {
            qc.invalidateQueries({ queryKey: ["rapor", payload.slug] })
          } else if (payload.collection) {
            qc.invalidateQueries({ queryKey: [payload.collection] })
          }
        } catch {
          // Invalid data, ignore
        }
      }

      es.onerror = () => {
        es?.close()
        // Reconnect after 3s
        if (mounted) {
          retryTimeout.current = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      mounted = false
      es?.close()
      if (retryTimeout.current) clearTimeout(retryTimeout.current)
    }
  }, [qc])
}
