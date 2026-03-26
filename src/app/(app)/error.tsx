"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app-error]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-4xl font-bold text-destructive/30 mb-4">Hata</div>
      <h1 className="text-xl font-semibold text-foreground mb-2">Bir şeyler yanlış gitti</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        Beklenmeyen bir hata oluştu. Sorun devam ederse sayfayı yenileyin.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Tekrar Dene
      </button>
    </div>
  )
}
