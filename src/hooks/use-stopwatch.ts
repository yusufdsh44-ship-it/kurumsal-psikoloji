"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export function useStopwatch() {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const start = useCallback(() => {
    if (running) return
    startTimeRef.current = Date.now() - elapsed * 1000
    setRunning(true)
  }, [running, elapsed])

  const stop = useCallback(() => {
    setRunning(false)
  }, [])

  const toggle = useCallback(() => {
    if (running) stop()
    else start()
  }, [running, start, stop])

  const reset = useCallback(() => {
    setRunning(false)
    setElapsed(0)
  }, [])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const display = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  const totalMinutes = Math.round(elapsed / 60)

  return { elapsed, minutes: totalMinutes, display, running, start, stop, toggle, reset }
}
