"use client"

import { useState, useMemo, useEffect } from "react"
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths,
  isSameDay, isSameMonth, startOfWeek, endOfWeek, isToday,
} from "date-fns"
import { tr } from "date-fns/locale"
import { useCollection, useUpdateRecord } from "@/hooks/use-data"
import { useMudurlukMap } from "@/hooks/use-danisanlar"
import { getKademeStyle, getInitials } from "@/lib/triyaj"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { RandevuDialog } from "@/components/danisan/randevu-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Plus, X, Globe, Check, XCircle, Settings } from "lucide-react"
import Link from "next/link"
import type { Danisan, RandevuTalebi, Musaitlik } from "@/types"

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]

export default function TakvimPage() {
  const { data: danisanlar } = useCollection("danisanlar")
  const { data: talepler } = useCollection("randevuTalepleri")
  const { data: musaitlikData } = useCollection("musaitlik")
  const mudurlukMap = useMudurlukMap()
  const updateDanisan = useUpdateRecord("danisanlar")
  const updateTalep = useUpdateRecord("randevuTalepleri")
  const updateMusaitlik = useUpdateRecord("musaitlik")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [musaitlikDirty, setMusaitlikDirty] = useState(false)
  const [pushingMusaitlik, setPushingMusaitlik] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [randevuDialogOpen, setRandevuDialogOpen] = useState(false)

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Danisan[]>()
    danisanlar?.forEach(d => {
      if (!d.sonrakiRandevu) return
      const key = d.sonrakiRandevu.split("T")[0]
      const list = map.get(key) || []
      list.push(d)
      map.set(key, list)
    })
    return map
  }, [danisanlar])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const selectedDayKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : ""
  const selectedAppointments = selectedDayKey ? appointmentsByDay.get(selectedDayKey) || [] : []

  const selectedDayTalepler = useMemo(() =>
    (talepler ?? []).filter(t => t.istenenTarih === selectedDayKey && t.durum === "Bekliyor"),
    [talepler, selectedDayKey]
  )

  // Tüm bekleyen talepler (tarih fark etmez)
  const allPendingTalepler = useMemo(() =>
    (talepler ?? []).filter(t => t.durum === "Bekliyor").sort((a, b) => b.olusturmaTarihi.localeCompare(a.olusturmaTarihi)),
    [talepler]
  )

  // Talep → danışan eşleştirme helper
  const findMatchingDanisan = (t: RandevuTalebi): Danisan | null => {
    if (!danisanlar) return null
    return danisanlar.find(d => d.adSoyad.toLowerCase() === t.adSoyad.toLowerCase()) ?? null
  }

  // Takvim günlerinde talep sayısı
  const talepsByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of talepler ?? []) {
      if (t.durum !== "Bekliyor") continue
      map.set(t.istenenTarih, (map.get(t.istenenTarih) ?? 0) + 1)
    }
    return map
  }, [talepler])

  const handleCancelAppointment = (d: Danisan) => {
    if (!confirm(`${d.adSoyad} randevusu iptal edilsin mi?`)) return
    updateDanisan.mutate({ id: d.id, data: { sonrakiRandevu: null } })
  }

  const handleApproveTalep = async (t: RandevuTalebi) => {
    // 1. Local talebi onayla
    updateTalep.mutate({ id: t.id, data: { durum: "Onaylandı" } })

    // 2. Supabase'de de onayla
    fetch("/api/sync-supabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-talep", data: { id: t.id, durum: "Onaylandı" } }),
    }).catch(() => {})

    // 3. Danışanı bul (ad eşleştirme) ve sonrakiRandevu güncelle
    const matchingDanisan = danisanlar?.find(d =>
      d.adSoyad.toLowerCase() === t.adSoyad.toLowerCase()
    )
    if (matchingDanisan) {
      const randevuISO = `${t.istenenTarih}T${t.istenenSaat}:00`
      updateDanisan.mutate({
        id: matchingDanisan.id,
        data: { sonrakiRandevu: randevuISO },
      })
    }
  }

  const handleRejectTalep = (t: RandevuTalebi) => {
    updateTalep.mutate({ id: t.id, data: { durum: "Reddedildi" } })
    fetch("/api/sync-supabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-talep", data: { id: t.id, durum: "Reddedildi" } }),
    }).catch(() => {})
  }

  const handleSyncSupabase = async () => {
    // 1. Talepleri çek
    await fetch("/api/sync-supabase")
    // 2. Müsaitliği push et
    await fetch("/api/sync-supabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "push-musaitlik" }),
    })
    // 3. TanStack Query invalidate
    window.location.reload()
  }

  const handleMusaitlikChange = (id: string, data: Record<string, unknown>) => {
    updateMusaitlik.mutate({ id, data })
    setMusaitlikDirty(true)
  }

  const handleSaveMusaitlik = async () => {
    setPushingMusaitlik(true)
    await fetch("/api/sync-supabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "push-musaitlik" }),
    })
    setPushingMusaitlik(false)
    setMusaitlikDirty(false)
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Takvim" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Randevu Takvimi</h1>
        <Button variant="outline" size="sm" onClick={handleSyncSupabase} className="text-xs">
          <Globe className="w-3.5 h-3.5 mr-1" /> Portal Sync
        </Button>
      </div>

      <Tabs defaultValue="internal">
        <TabsList>
          <TabsTrigger value="internal">Dahili Takvim</TabsTrigger>
          <TabsTrigger value="musaitlik">
            <Settings className="w-3.5 h-3.5 mr-1" />Müsaitlik
          </TabsTrigger>
          <TabsTrigger value="google">Google Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="internal" className="mt-4 space-y-4">
          {/* Bekleyen Talepler — sayfa açılınca hemen görünür */}
          {allPendingTalepler.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  Bekleyen Online Talepler
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{allPendingTalepler.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {allPendingTalepler.map(t => {
                    const match = findMatchingDanisan(t)
                    const ks = match ? getKademeStyle(match.triyajKademesi) : null
                    return (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-blue-100 hover:shadow-sm transition-all">
                        {/* Avatar */}
                        {match ? (
                          <Link href={`/danisanlar/${match.id}`}
                            className="shrink-0 hover:ring-2 hover:ring-primary/30 transition-all rounded-lg">
                            {match.fotograf ? (
                              <img src={`/api/foto/${match.fotograf}`} alt={match.adSoyad}
                                className="w-9 h-9 rounded-lg object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                                style={{ background: ks!.text }}>
                                {getInitials(match.adSoyad)}
                              </div>
                            )}
                          </Link>
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                            {getInitials(t.adSoyad)}
                          </div>
                        )}

                        {/* Bilgiler */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {match ? (
                              <Link href={`/danisanlar/${match.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate">
                                {t.adSoyad}
                              </Link>
                            ) : (
                              <span className="text-sm font-semibold text-foreground truncate">{t.adSoyad}</span>
                            )}
                            {match ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0" style={{ background: ks!.bg, color: ks!.text }}>
                                Kademe {match.triyajKademesi ?? "?"}
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium shrink-0">Yeni</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {t.mudurluk} · {t.gorusmeTuru}
                            {t.referansKodu && <span className="ml-1.5 font-mono text-primary/70">{t.referansKodu}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-semibold text-blue-700">
                              {new Date(t.istenenTarih + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" })} · {t.istenenSaat}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">
                              talep: {new Date(t.olusturmaTarihi).toLocaleDateString("tr-TR")}
                            </span>
                          </div>
                        </div>

                        {/* Aksiyonlar */}
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => handleApproveTalep(t)}
                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Onayla">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleRejectTalep(t)}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Reddet">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar grid — randevu detaylı */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <CardTitle className="text-base">
                    {format(currentMonth, "MMMM yyyy", { locale: tr })}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden">
                  {DAYS.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2 bg-background">{day}</div>
                  ))}
                  {days.map(day => {
                    const key = format(day, "yyyy-MM-dd")
                    const appts = appointmentsByDay.get(key) || []
                    const pendingCount = talepsByDay.get(key) ?? 0
                    const inMonth = isSameMonth(day, currentMonth)
                    const today = isToday(day)
                    const selected = selectedDay && isSameDay(day, selectedDay)
                    return (
                      <button key={key} onClick={() => setSelectedDay(day)}
                        className={`relative text-left p-1.5 min-h-[85px] transition-colors bg-background ${
                          !inMonth ? "opacity-30" :
                          selected ? "bg-primary/5 ring-2 ring-primary ring-inset" :
                          today ? "bg-amber-50/50" :
                          "hover:bg-muted/50"
                        }`}>
                        <div className={`text-xs font-medium mb-1 ${today ? "text-amber-700 font-bold" : selected ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {format(day, "d")}
                        </div>
                        {/* Mini randevu kartları */}
                        <div className="space-y-0.5">
                          {appts.slice(0, 2).map((d, i) => {
                            const ks = getKademeStyle(d.triyajKademesi)
                            const time = d.sonrakiRandevu?.split("T")[1]?.slice(0, 5) ?? ""
                            return (
                              <div key={i} className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] leading-tight truncate"
                                style={{ background: ks.bg, color: ks.text }}>
                                <span className="font-mono font-bold">{time}</span>
                                <span className="truncate">{d.adSoyad.split(" ")[0]}</span>
                              </div>
                            )
                          })}
                          {appts.length > 2 && (
                            <div className="text-[9px] text-muted-foreground px-1">+{appts.length - 2} daha</div>
                          )}
                        </div>
                        {/* Bekleyen talep indicator */}
                        {pendingCount > 0 && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] font-bold flex items-center justify-center">
                            {pendingCount}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Day detail — iyileştirilmiş */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalIcon className="w-4 h-4" />
                  <span className="flex-1">
                    {selectedDay ? format(selectedDay, "d MMMM yyyy, EEEE", { locale: tr }) : "Gün seçin"}
                  </span>
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => setRandevuDialogOpen(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Ekle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedAppointments.length === 0 && selectedDayTalepler.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-3">Bu günde randevu yok.</p>
                    <Button variant="outline" size="sm" onClick={() => setRandevuDialogOpen(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Randevu Oluştur
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Onaylı randevular */}
                    {selectedAppointments
                      .sort((a, b) => (a.sonrakiRandevu ?? "").localeCompare(b.sonrakiRandevu ?? ""))
                      .map(d => {
                        const ks = getKademeStyle(d.triyajKademesi)
                        const time = d.sonrakiRandevu?.includes("T") ? d.sonrakiRandevu.split("T")[1]?.slice(0, 5) : "—"
                        return (
                          <Link key={d.id} href={`/danisanlar/${d.id}`}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors group border border-transparent hover:border-border">
                            {d.fotograf ? (
                              <img src={`/api/foto/${d.fotograf}`} alt={d.adSoyad}
                                className="w-8 h-8 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ background: ks.text }}>
                                {getInitials(d.adSoyad)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{d.adSoyad}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {mudurlukMap.get(d.mudurlukId)?.mudurlukAdi ?? ""}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono font-bold text-foreground">{time}</div>
                              <span className="text-[10px] px-1 py-0.5 rounded font-bold" style={{ background: ks.bg, color: ks.text }}>
                                {d.triyajKademesi}
                              </span>
                            </div>
                          </Link>
                        )
                      })}

                    {/* O günün online talepleri */}
                    {selectedDayTalepler.length > 0 && (
                      <div className="pt-2 mt-2 border-t border-border/50">
                        <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-1.5 px-1">Online Talepler</div>
                        {selectedDayTalepler.map(t => {
                          const match = findMatchingDanisan(t)
                          const ks = match ? getKademeStyle(match.triyajKademesi) : null
                          return (
                            <div key={t.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-blue-50/50">
                              {match ? (
                                <Link href={`/danisanlar/${match.id}`} className="shrink-0">
                                  {match.fotograf ? (
                                    <img src={`/api/foto/${match.fotograf}`} alt={match.adSoyad}
                                      className="w-7 h-7 rounded-md object-cover" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
                                      style={{ background: ks!.text }}>
                                      {getInitials(match.adSoyad)}
                                    </div>
                                  )}
                                </Link>
                              ) : (
                                <div className="w-7 h-7 rounded-md bg-blue-200 flex items-center justify-center text-[9px] font-bold text-blue-700 shrink-0">
                                  {getInitials(t.adSoyad)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">{t.adSoyad}</div>
                                <div className="text-[10px] text-muted-foreground">{t.istenenSaat} · {t.gorusmeTuru}</div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); handleApproveTalep(t) }}
                                  className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-100" title="Onayla">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleRejectTalep(t) }}
                                  className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100" title="Reddet">
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="musaitlik" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Haftalık Müsaitlik Ayarları</CardTitle>
                <Button
                  size="sm"
                  className={`h-7 text-xs transition-all ${musaitlikDirty ? "bg-green-600 hover:bg-green-700 text-white shadow-md" : ""}`}
                  variant={musaitlikDirty ? "default" : "outline"}
                  disabled={pushingMusaitlik}
                  onClick={handleSaveMusaitlik}
                >
                  {pushingMusaitlik ? "Kaydediliyor..." : musaitlikDirty ? "Kaydet ve Yayınla" : "Kaydet ve Yayınla"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Değişiklik yaptıktan sonra &quot;Kaydet ve Yayınla&quot; ile portala yansıtın.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Per-day settings */}
              <div className="space-y-2">
                {(musaitlikData ?? []).map(m => {
                  const gunAdi = ["", "Pzt", "Sal", "Çar", "Per", "Cum"][m.gun] ?? ""
                  return (
                    <div key={m.gun} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${m.aktif ? "bg-card border-border" : "bg-muted/30 border-border/40 opacity-60"}`}>
                      <button
                        onClick={() => handleMusaitlikChange(m.id, { aktif: !m.aktif })}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${m.aktif ? "bg-green-500" : "bg-muted-foreground/30"}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${m.aktif ? "left-[17px]" : "left-0.5"}`} />
                      </button>
                      <span className="text-xs font-semibold w-8">{gunAdi}</span>
                      <input type="time" value={m.baslangic}
                        onChange={e => handleMusaitlikChange(m.id, { baslangic: e.target.value })}
                        disabled={!m.aktif}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-xs w-20" />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input type="time" value={m.bitis}
                        onChange={e => handleMusaitlikChange(m.id, { bitis: e.target.value })}
                        disabled={!m.aktif}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-xs w-20" />
                      <select value={m.slotDk}
                        onChange={e => handleMusaitlikChange(m.id, { slotDk: Number(e.target.value) })}
                        disabled={!m.aktif}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-xs ml-auto">
                        <option value={20}>20dk</option>
                        <option value={30}>30dk</option>
                        <option value={45}>45dk</option>
                        <option value={50}>50dk</option>
                        <option value={60}>60dk</option>
                      </select>
                    </div>
                  )
                })}
              </div>

              {/* Tarihe ozel slot tablosu */}
              <DateSlotGrid musaitlikData={(musaitlikData ?? []) as Musaitlik[]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CalIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Google Calendar embed URL&apos;sini ayarlardan ekleyin.</p>
              <p className="text-xs mt-1">Eklendiğinde takvim burada görüntülenecek.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RandevuDialog
        open={randevuDialogOpen}
        onOpenChange={setRandevuDialogOpen}
        initialDate={selectedDay ?? undefined}
        onScheduled={() => setRandevuDialogOpen(false)}
      />
    </div>
  )
}

/* ── Tarihe Ozel Slot Grid ──────────────── */

function DateSlotGrid({ musaitlikData }: { musaitlikData: Musaitlik[] }) {
  const [kapaliMap, setKapaliMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  // Gelecek 10 is gunu
  const days = useMemo(() => {
    const result: { date: string; label: string; weekday: number }[] = []
    const today = new Date()
    for (let i = 1; result.length < 10 && i <= 30; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const dow = d.getDay()
      if (dow >= 1 && dow <= 5) {
        const dateStr = d.toISOString().split("T")[0]
        const config = musaitlikData.find(m => m.gun === dow)
        if (config?.aktif) {
          result.push({
            date: dateStr,
            label: d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" }),
            weekday: dow,
          })
        }
      }
    }
    return result
  }, [musaitlikData])

  // Tum gunlerin kapali slotlarini cek
  useEffect(() => {
    if (days.length === 0) return
    Promise.all(days.map(d =>
      fetch("/api/sync-supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-closed-slots", data: { tarih: d.date } }),
      }).then(r => r.json()).then(res => ({ date: d.date, slots: res.slots ?? [] as string[] }))
    )).then(results => {
      const map: Record<string, string[]> = {}
      for (const r of results) map[r.date] = r.slots
      setKapaliMap(map)
    })
  }, [days])

  // Slotlari hesapla (ilk aktif gunun ayarlarindan)
  const allSlots = useMemo(() => {
    const slots = new Set<string>()
    for (const m of musaitlikData) {
      if (!m.aktif) continue
      const [sh, sm] = m.baslangic.split(":").map(Number)
      const [eh, em] = m.bitis.split(":").map(Number)
      let t = sh * 60 + sm
      const end = eh * 60 + em
      while (t + m.slotDk <= end) {
        slots.add(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`)
        t += m.slotDk
      }
    }
    return Array.from(slots).sort()
  }, [musaitlikData])

  const toggleSlot = async (tarih: string, saat: string) => {
    const kapali = kapaliMap[tarih] ?? []
    const isKapali = kapali.includes(saat)
    setLoading(true)
    try {
      await fetch("/api/sync-supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isKapali ? "open-slot" : "close-slot", data: { tarih, saat } }),
      })
      setKapaliMap(prev => ({
        ...prev,
        [tarih]: isKapali ? (prev[tarih] ?? []).filter(s => s !== saat) : [...(prev[tarih] ?? []), saat],
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Slot Tablosu</h3>
        <p className="text-[10px] text-muted-foreground">Yeşil = müsait · Tıklayarak tarihe özel kapat/aç</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-[10px] font-medium text-muted-foreground p-1 w-14 text-left">Saat</th>
              {days.map(d => (
                <th key={d.date} className="text-[10px] font-medium text-foreground p-1 text-center">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allSlots.map(slot => (
              <tr key={slot}>
                <td className="text-[11px] font-mono text-muted-foreground px-1 py-0.5">{slot}</td>
                {days.map(d => {
                  const config = musaitlikData.find(m => m.gun === d.weekday)
                  if (!config?.aktif) return <td key={d.date} className="p-0.5"><div className="h-6 rounded bg-muted/30" /></td>
                  const [sh, sm] = config.baslangic.split(":").map(Number)
                  const [eh, em] = config.bitis.split(":").map(Number)
                  const [slotH, slotM] = slot.split(":").map(Number)
                  const slotMin = slotH * 60 + slotM
                  const inRange = slotMin >= sh * 60 + sm && slotMin + config.slotDk <= eh * 60 + em
                  if (!inRange) return <td key={d.date} className="p-0.5"><div className="h-6 rounded bg-muted/20" /></td>

                  const isKapali = (kapaliMap[d.date] ?? []).includes(slot)
                  return (
                    <td key={d.date} className="p-0.5">
                      <button
                        onClick={() => toggleSlot(d.date, slot)}
                        disabled={loading}
                        className={`w-full h-6 rounded text-[10px] font-medium transition-all disabled:opacity-50 ${
                          isKapali
                            ? "bg-red-50 text-red-400 border border-red-200 hover:bg-red-100"
                            : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                        }`}
                      >
                        {isKapali ? "×" : "✓"}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
