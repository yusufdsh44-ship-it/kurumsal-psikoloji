import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl font-bold text-muted-foreground/20 mb-4">404</div>
      <h1 className="text-xl font-semibold text-foreground mb-2">Sayfa Bulunamadı</h1>
      <p className="text-sm text-muted-foreground mb-6">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Dashboard'a Dön
      </Link>
    </div>
  )
}
