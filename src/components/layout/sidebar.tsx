"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, ClipboardCheck, FileText, Building2,
  Calendar, BarChart3, Clock, Search, PanelLeftClose, PanelLeft, RefreshCw, Brain, ChevronDown, MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/hooks/use-recent"
import { useCollection, useSyncAll } from "@/hooks/use-data"
import { getKademeStyle, formatDate } from "@/lib/triyaj"
import type { Danisan, GorusmeNotu } from "@/types"

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Users, ClipboardCheck, FileText, Building2, Calendar, BarChart3, Clock, MessageSquare,
}

const MENU = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/danisanlar", label: "Danışanlar", icon: "Users", countKey: "danisanlar" },
  { href: "/testler", label: "Test Sonuçları", icon: "ClipboardCheck", countKey: "testSonuclari" },
  { href: "/planlar", label: "Seans Planları", icon: "FileText", countKey: "seansPlanlari" },
  { href: "/mudurlukler", label: "Müdürlükler", icon: "Building2", countKey: "mudurlukler" },
  { href: "/takvim", label: "Takvim", icon: "Calendar" },
  { href: "/raporlar", label: "Raporlar", icon: "BarChart3" },
  { href: "/mesajlar", label: "Mesajlar", icon: "MessageSquare", countKey: "mesajlar" },
]

interface SidebarProps {
  onOpenSearch: () => void
}

export function Sidebar({ onOpenSearch }: SidebarProps) {
  const pathname = usePathname()
  const { recentDanisanlar, sidebarCollapsed, toggleSidebar } = useAppStore()
  const { data: danisanlar } = useCollection("danisanlar")
  const { data: testler } = useCollection("testSonuclari")
  const { data: planlar } = useCollection("seansPlanlari")
  const { data: mudurlukler } = useCollection("mudurlukler")
  const { data: mesajlar } = useCollection("mesajlar")
  const { data: notlarRaw } = useCollection("gorusmeNotlari")
  const sync = useSyncAll()
  const [takvimOpen, setTakvimOpen] = useState(false)
  const [recentOpen, setRecentOpen] = useState(false)

  // Build upcoming + recent sessions timeline
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
  const sevenDaysLater = new Date(now.getTime() + 7 * 86400000)

  const danisanMap = new Map((danisanlar ?? []).map((d: Danisan) => [d.id, d]))

  // Upcoming appointments from danisanlar.sonrakiRandevu
  const upcoming = (danisanlar ?? [])
    .filter((d: Danisan) => d.sonrakiRandevu && new Date(d.sonrakiRandevu) >= now && new Date(d.sonrakiRandevu) <= sevenDaysLater)
    .map((d: Danisan) => ({ id: d.id, ad: d.adSoyad, tarih: d.sonrakiRandevu!, kademe: d.triyajKademesi, done: false }))
    .sort((a: { tarih: string }, b: { tarih: string }) => a.tarih.localeCompare(b.tarih))

  // Recent completed sessions from gorusmeNotlari (last 7 days)
  const recentSessions = (notlarRaw ?? [])
    .filter((n: GorusmeNotu) => {
      const d = new Date(n.tarih)
      return d >= sevenDaysAgo && d < now
    })
    .map((n: GorusmeNotu) => {
      const d = danisanMap.get(n.danisanId)
      return { id: n.id, ad: d?.adSoyad ?? "?", tarih: n.tarih, kademe: d?.triyajKademesi ?? null, done: true, tur: n.tur }
    })
    .sort((a: { tarih: string }, b: { tarih: string }) => b.tarih.localeCompare(a.tarih))
    .slice(0, 5)

  const timeline = [...recentSessions.reverse(), ...upcoming].slice(0, 8)

  const unreadMesaj = mesajlar?.filter(m => !m.okundu).length ?? 0
  const counts: Record<string, number> = {
    danisanlar: danisanlar?.length ?? 0,
    testSonuclari: testler?.length ?? 0,
    seansPlanlari: planlar?.length ?? 0,
    mudurlukler: mudurlukler?.length ?? 0,
    mesajlar: unreadMesaj,
  }

  // Bugünün randevuları
  const today = new Date().toISOString().split("T")[0]
  const todayAppointments = danisanlar?.filter((d: Danisan) =>
    d.sonrakiRandevu?.startsWith(today)
  ).slice(0, 5) ?? []

  if (sidebarCollapsed) {
    return (
      <aside className="w-16 bg-[#1C1917] flex flex-col items-center py-4 gap-2 shrink-0">
        <button onClick={toggleSidebar} aria-label="Menüyü genişlet" className="p-2 rounded-lg hover:bg-[#292524] text-stone-400 hover:text-white transition-colors">
          <PanelLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-px bg-stone-700 my-1" />
        {MENU.map(item => {
          const Icon = ICON_MAP[item.icon]
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} aria-label={item.label}
              className={cn(
                "p-2.5 rounded-lg transition-colors relative",
                active ? "bg-[#292524] text-amber-500" : "text-stone-400 hover:bg-[#292524] hover:text-white"
              )}>
              <Icon className="w-5 h-5" />
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r" />}
            </Link>
          )
        })}
      </aside>
    )
  }

  return (
    <aside className="w-64 bg-[#1C1917] flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">Kurumsal Psikoloji</div>
          <div className="text-xs text-stone-500">Arnavutköy Belediyesi</div>
        </div>
        <button onClick={toggleSidebar} aria-label="Menüyü daralt" className="p-1.5 rounded hover:bg-[#292524] text-stone-500 hover:text-stone-300 transition-colors">
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Search trigger */}
      <div className="px-3 mb-2">
        <button onClick={onOpenSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#292524] text-stone-400 text-sm hover:bg-[#44403C] transition-colors">
          <Search className="w-4 h-4" />
          <span>Ara...</span>
          <kbd className="ml-auto text-xs bg-[#44403C] px-1.5 py-0.5 rounded text-stone-500">⌘K</kbd>
        </button>
      </div>

      {/* Menu */}
      <nav className="px-2 flex-1 overflow-y-auto">
        <div className="space-y-0.5">
          {MENU.map(item => {
            const Icon = ICON_MAP[item.icon]
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            const count = item.countKey ? counts[item.countKey] : undefined
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative",
                  active
                    ? "bg-[#292524] text-white font-medium"
                    : "text-stone-400 hover:bg-[#292524] hover:text-white"
                )}>
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r" />}
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {count !== undefined && count > 0 && (
                  <span className="text-xs bg-[#44403C] text-stone-400 px-1.5 py-0.5 rounded-md">{count}</span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Seans Takvimi — collapsible, above Son Görülen */}
        {timeline.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setTakvimOpen(p => !p)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-500 uppercase tracking-wider hover:text-stone-300 transition-colors"
            >
              <Calendar className="w-3 h-3" />
              <span>Seans Takvimi</span>
              <span className="text-[10px] normal-case tracking-normal font-normal text-stone-600">({timeline.length})</span>
              <ChevronDown className={cn("w-3 h-3 ml-auto transition-transform", takvimOpen && "rotate-180")} />
            </button>
            {takvimOpen && (
              <div className="relative ml-6 border-l border-stone-700/50 mt-1">
                {timeline.map((s, i) => {
                  const date = new Date(s.tarih)
                  const isToday = date.toDateString() === now.toDateString()
                  const dayLabel = isToday ? "Bugün" : date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })
                  const timeLabel = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
                  const style = s.kademe ? getKademeStyle(s.kademe) : null
                  return (
                    <div key={s.id + i} className="relative pl-4 pb-3 last:pb-0">
                      <div className={cn(
                        "absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2",
                        s.done
                          ? "bg-stone-600 border-stone-500"
                          : isToday
                            ? "bg-amber-500 border-amber-400 animate-pulse"
                            : "bg-transparent border-stone-500"
                      )} />
                      <div className="min-w-0">
                        <div className={cn("text-xs font-medium truncate", s.done ? "text-stone-500 line-through decoration-stone-600" : "text-stone-300")}>
                          {s.ad}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn("text-[10px] font-mono", isToday ? "text-amber-500" : "text-stone-600")}>{dayLabel} {timeLabel}</span>
                          {style && (
                            <span className="text-[9px] px-1 py-px rounded font-bold" style={{ background: style.bg, color: style.text }}>
                              {s.kademe}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Son görülenler — collapsible */}
        {recentDanisanlar.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setRecentOpen(p => !p)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-500 uppercase tracking-wider hover:text-stone-300 transition-colors"
            >
              <Clock className="w-3 h-3" />
              <span>Son Görülen</span>
              <span className="text-[10px] normal-case tracking-normal font-normal text-stone-600">({recentDanisanlar.length})</span>
              <ChevronDown className={cn("w-3 h-3 ml-auto transition-transform", recentOpen && "rotate-180")} />
            </button>
            {recentOpen && (
              <div className="space-y-0.5 mt-1">
                {recentDanisanlar.map(d => {
                  const style = getKademeStyle(d.triyajKademesi)
                  return (
                    <Link key={d.id} href={`/danisanlar/${d.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-stone-400 hover:bg-[#292524] hover:text-white transition-colors">
                      <span className="flex-1 truncate">{d.adSoyad}</span>
                      {d.triyajKademesi && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                          style={{ background: style.bg, color: style.text }}>
                          {d.triyajKademesi}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Bugünün programı */}
        {todayAppointments.length > 0 && (
          <div className="mt-6">
            <div className="px-3 mb-2 text-xs font-medium text-stone-600 uppercase tracking-wider">Bugün</div>
            <div className="space-y-0.5">
              {todayAppointments.map(d => {
                const style = getKademeStyle(d.triyajKademesi)
                return (
                  <Link key={d.id} href={`/danisanlar/${d.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-stone-400 hover:bg-[#292524] hover:text-white transition-colors">
                    <span className="text-xs text-stone-600 font-mono w-10">{d.sonrakiRandevu?.split("T")[1]?.slice(0, 5) ?? "—"}</span>
                    <span className="flex-1 truncate">{d.adSoyad}</span>
                    <span className="w-2 h-2 rounded-full" style={{ background: style.text }} />
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Sync */}
      <div className="px-3 py-2 border-t border-stone-800/50">
        <button
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          aria-label="Veriyi senkronize et"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-500 hover:bg-[#292524] hover:text-stone-300 transition-colors disabled:opacity-50 group">
          <div className="relative">
            <RefreshCw className={cn("w-3.5 h-3.5 transition-transform group-hover:rotate-45", sync.isPending && "animate-spin")} />
            {!sync.isPending && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500 ring-2 ring-[#1C1917]" />}
          </div>
          <span className="flex-1 text-left text-xs">
            {sync.isPending ? "Senkronize ediliyor..." : "Senkronize Et"}
          </span>
          {!sync.isPending && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 font-medium">
              Auto
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
