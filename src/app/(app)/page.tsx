"use client"

import { useCollection } from "@/hooks/use-data"
import { useMudurlukMap } from "@/hooks/use-danisanlar"
import { getKademeStyle, getBfiKademeStyle, formatDate, getInitials } from "@/lib/triyaj"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, AlertTriangle, Calendar, Clock, ClipboardCheck, Building2, UserX } from "lucide-react"
import Link from "next/link"
import type { Danisan, Mudurluk } from "@/types"

export default function DashboardPage() {
  const { data: danisanlar, isLoading } = useCollection("danisanlar")
  const { data: testSonuclari } = useCollection("testSonuclari")
  const { data: mudurlukler } = useCollection("mudurlukler")
  const { data: gorusmeNotlari } = useCollection("gorusmeNotlari")
  const mudurlukMap = useMudurlukMap()

  if (isLoading || !danisanlar) {
    return <DashboardSkeleton />
  }

  const total = danisanlar.length
  const acilYuksek = danisanlar.filter(d => d.triyajKademesi === 1 || d.triyajKademesi === 2)
  const surecte = danisanlar.filter(d => d.genelDurum === "Süreçte")
  const henuzGorulmedi = danisanlar.filter(d => d.genelDurum === "Henüz Görülmedi")
  const takipBekleyen = danisanlar.filter(d => d.genelDurum === "Takipte" && !d.sonrakiRandevu)

  // #1 — Takip gecikmesi: aktif + son görüşme 14+ gün önce
  const now = new Date()
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000)
  const gecikenler = danisanlar.filter(d => {
    if (d.genelDurum !== "Süreçte" && d.genelDurum !== "Takipte") return false
    if (!d.sonGorusme) return d.genelDurum === "Süreçte"
    return new Date(d.sonGorusme) < twoWeeksAgo
  }).sort((a, b) => {
    const aDate = a.sonGorusme ? new Date(a.sonGorusme).getTime() : 0
    const bDate = b.sonGorusme ? new Date(b.sonGorusme).getTime() : 0
    return aDate - bDate
  })

  // #3 — No-show: geçmiş randevusu olup görüşme notu girilmemiş
  const todayStr = now.toISOString().split("T")[0]
  const notTarihleri = new Set((gorusmeNotlari ?? []).map(n => `${n.danisanId}_${n.tarih.split("T")[0]}`))
  const noShows = danisanlar.filter(d => {
    if (!d.sonrakiRandevu) return false
    const randevuDate = d.sonrakiRandevu.split("T")[0]
    if (randevuDate >= todayStr) return false
    return !notTarihleri.has(`${d.id}_${randevuDate}`)
  })

  // #5 — En riskli müdürlükler (en düşük denge)
  const riskliMudurlukler = (mudurlukler ?? [])
    .filter(m => m.denge !== null)
    .sort((a, b) => (a.denge ?? 0) - (b.denge ?? 0))
    .slice(0, 5)

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={AlertTriangle} label="Acil + Yüksek" value={acilYuksek.length}
          color="#DC2626" subtitle="Kademe 1-2" />
        <SummaryCard icon={Clock} label="Süreçte" value={surecte.length}
          color="#2563EB" subtitle="Aktif takip" />
        <SummaryCard icon={Calendar} label="Takip Bekleyen" value={takipBekleyen.length}
          color="#CA8A04" subtitle="Randevusu yok" />
        <SummaryCard icon={Users} label="Henüz Görülmedi" value={henuzGorulmedi.length}
          color="#78716C" subtitle={`/ ${total} personel`} />
      </div>

      {/* Tarama İlerlemesi */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tarama İlerlemesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <ProgressStat label="Test" count={new Set((testSonuclari ?? []).map(t => t.danisanId)).size} total={total} color="#2563EB" icon={ClipboardCheck} />
            <ProgressStat label="Görüşme" count={danisanlar.filter(d => d.gorusmeYapildi).length} total={total} color="#16A34A" icon={Users} />
          </div>
        </CardContent>
      </Card>

      {/* Bugünün Programı */}
      <TodaySchedule danisanlar={danisanlar} mudurlukMap={mudurlukMap} />

      {/* #1 — Takibi Geciken Danışanlar */}
      {gecikenler.length > 0 && (
        <Card className="mb-6 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Takibi Geciken Danışanlar
              <span className="text-xs font-normal bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{gecikenler.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40">
              {gecikenler.slice(0, 8).map(d => {
                const days = d.sonGorusme ? Math.floor((now.getTime() - new Date(d.sonGorusme).getTime()) / 86400000) : null
                return (
                  <Link key={d.id} href={`/danisanlar/${d.id}`}
                    className="flex items-center gap-3 py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{d.adSoyad}</span>
                      <span className="text-xs text-muted-foreground ml-2">{mudurlukMap.get(d.mudurlukId)?.mudurlukAdi ?? ""}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{d.sonGorusme ? formatDate(d.sonGorusme) : "Hiç görülmedi"}</span>
                    {days !== null && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${days >= 30 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {days} gün
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
            {gecikenler.length > 8 && (
              <Link href="/danisanlar" className="block text-center text-xs text-primary hover:underline mt-2">
                Tümünü gör ({gecikenler.length} danışan)
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* #3 — No-Show */}
      {noShows.length > 0 && (
        <Card className="mb-6 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-500" />
              Randevuya Gelmeyen
              <span className="text-xs font-normal bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{noShows.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40">
              {noShows.slice(0, 5).map(d => (
                <Link key={d.id} href={`/danisanlar/${d.id}`}
                  className="flex items-center gap-3 py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{d.adSoyad}</span>
                    <span className="text-xs text-muted-foreground ml-2">{mudurlukMap.get(d.mudurlukId)?.mudurlukAdi ?? ""}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Randevu: {formatDate(d.sonrakiRandevu)}</span>
                  <span className="text-xs font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Gelmedi</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* #5 — Kritik Müdürlükler */}
      {riskliMudurlukler.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-red-500" />
              Kritik Müdürlükler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40">
              {riskliMudurlukler.map(m => {
                const acilCount = danisanlar.filter(d => d.mudurlukId === m.id && (d.triyajKademesi === 1 || d.triyajKademesi === 2)).length
                return (
                  <Link key={m.id} href={`/mudurlukler/${m.id}`}
                    className="flex items-center gap-3 py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{m.mudurlukAdi}</span>
                    </div>
                    <span className={`text-xs font-bold font-mono ${(m.denge ?? 0) < 0 ? "text-red-600" : "text-amber-600"}`}>
                      Denge: {m.denge?.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Ruh S. %{m.ruhSagligiRiski?.toFixed(0)}
                    </span>
                    {acilCount > 0 && (
                      <span className="text-xs font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                        {acilCount} acil
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Acil ve Yüksek Öncelikli Danışanlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {acilYuksek.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Acil veya yüksek öncelikli danışan bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 text-sm font-medium text-muted-foreground">Danışan</th>
                    <th className="text-left py-2.5 px-3 text-sm font-medium text-muted-foreground">Müdürlük</th>
                    <th className="text-center py-2.5 px-3 text-sm font-medium text-muted-foreground">Kademe</th>
                    <th className="text-center py-2.5 px-3 text-sm font-medium text-muted-foreground">GSI</th>
                    <th className="text-center py-2.5 px-3 text-sm font-medium text-muted-foreground">KSE</th>
                    <th className="text-center py-2.5 px-3 text-sm font-medium text-muted-foreground">BFI</th>
                    <th className="text-left py-2.5 px-3 text-sm font-medium text-muted-foreground">Durum</th>
                    <th className="text-left py-2.5 px-3 text-sm font-medium text-muted-foreground">Not</th>
                  </tr>
                </thead>
                <tbody>
                  {acilYuksek.sort((a, b) => (a.triyajKademesi ?? 5) - (b.triyajKademesi ?? 5)).map(d => (
                    <DanisanRow key={d.id} danisan={d} mudurlukAdi={mudurlukMap.get(d.mudurlukId)?.mudurlukAdi ?? "—"} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, color, subtitle }: {
  icon: React.ElementType; label: string; value: string | number; color: string; subtitle?: string
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "15" }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DanisanRow({ danisan: d, mudurlukAdi }: { danisan: Danisan; mudurlukAdi: string }) {
  const kademeStyle = getKademeStyle(d.triyajKademesi)
  const bfiStyle = getBfiKademeStyle(d.bfiKademe)

  return (
    <tr className="border-b border-border/40 hover:bg-muted/50 transition-colors">
      <td className="py-2.5 px-3">
        <Link href={`/danisanlar/${d.id}`} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: kademeStyle.text }}>
            {getInitials(d.adSoyad)}
          </div>
          <div>
            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{d.adSoyad}</div>
            <div className="text-xs text-muted-foreground font-mono">#{d.sicilNo}</div>
          </div>
        </Link>
      </td>
      <td className="py-2.5 px-3 text-sm text-muted-foreground">{mudurlukAdi}</td>
      <td className="py-2.5 px-3 text-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold"
          style={{ background: kademeStyle.bg, color: kademeStyle.text }}>
          {d.triyajKademesi ?? "—"}
        </span>
      </td>
      <td className="py-2.5 px-3 text-center text-sm font-mono">{d.gsiSkoru?.toFixed(2) ?? "—"}</td>
      <td className="py-2.5 px-3 text-center">
        {d.kseKademe && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
            style={{ background: getKademeStyle(Number(d.kseKademe)).bg, color: getKademeStyle(Number(d.kseKademe)).text }}>
            {d.kseKademe}
          </span>
        )}
      </td>
      <td className="py-2.5 px-3 text-center">
        {d.bfiKademe && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
            style={{ background: bfiStyle.bg, color: bfiStyle.text }}>
            {d.bfiKademe}
          </span>
        )}
      </td>
      <td className="py-2.5 px-3 text-sm text-muted-foreground">{d.genelDurum}</td>
      <td className="py-2.5 px-3 text-sm text-muted-foreground truncate max-w-[200px]">{d.klinikOzet?.slice(0, 60) || "—"}</td>
    </tr>
  )
}

function ProgressStat({ label, count, total, color, icon: Icon }: {
  label: string; count: number; total: number; color: string; icon: React.ElementType
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{count}/{total}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-right text-[11px] font-bold" style={{ color }}>%{pct}</div>
    </div>
  )
}

function TodaySchedule({ danisanlar, mudurlukMap }: { danisanlar: Danisan[]; mudurlukMap: Map<string, { mudurlukAdi: string }> }) {
  const today = new Date().toISOString().split("T")[0]
  const todayAppts = danisanlar
    .filter(d => d.sonrakiRandevu?.startsWith(today))
    .sort((a, b) => (a.sonrakiRandevu ?? "").localeCompare(b.sonrakiRandevu ?? ""))

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          Bugünün Programı
          {todayAppts.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({todayAppts.length} randevu)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todayAppts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">Bugün randevu yok.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {todayAppts.map(d => {
              const ks = getKademeStyle(d.triyajKademesi)
              const time = d.sonrakiRandevu?.includes("T") ? d.sonrakiRandevu.split("T")[1]?.slice(0, 5) : "—"
              return (
                <Link key={d.id} href={`/danisanlar/${d.id}`}
                  className="flex items-center gap-3 py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
                  <span className="text-sm font-mono text-muted-foreground w-12 shrink-0">{time}</span>
                  <div className="w-1.5 h-6 rounded-full shrink-0" style={{ background: ks.text }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{d.adSoyad}</span>
                    <span className="text-xs text-muted-foreground ml-2">{mudurlukMap.get(d.mudurlukId)?.mudurlukAdi ?? ""}</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold shrink-0"
                    style={{ background: ks.bg, color: ks.text }}>{d.triyajKademesi}</span>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="h-8 w-40 bg-muted rounded mb-6 animate-pulse" />
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
      </div>
      <div className="h-64 bg-muted rounded-xl animate-pulse" />
    </div>
  )
}
