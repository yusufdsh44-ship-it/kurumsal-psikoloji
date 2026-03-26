"use client"

import { useEffect } from "react"

type KeyHandler = (e: KeyboardEvent) => void

export function useKeyboardShortcut(key: string, handler: KeyHandler, opts?: { meta?: boolean; shift?: boolean; enabled?: boolean }) {
  useEffect(() => {
    if (opts?.enabled === false) return
    const listener = (e: KeyboardEvent) => {
      if (opts?.meta && !e.metaKey && !e.ctrlKey) return
      if (opts?.shift && !e.shiftKey) return
      if (e.key.toLowerCase() === key.toLowerCase()) {
        handler(e)
      }
    }
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [key, handler, opts?.meta, opts?.shift, opts?.enabled])
}
