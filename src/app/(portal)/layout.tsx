export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {children}
      </div>
    </div>
  )
}
