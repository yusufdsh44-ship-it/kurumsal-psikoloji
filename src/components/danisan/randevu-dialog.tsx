"use client"

import { useState, useMemo } from "react"
import { useCollection, useUpdateRecord } from "@/hooks/use-data"
import { useMudurlukMap } from "@/hooks/use-danisanlar"
import { getKademeStyle } from "@/lib/triyaj"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, AlertTriangle, Ban } from "lucide-react"
import type { Danisan, Musaitlik } from "@/types"

// Müsaitlik verisinden dinamik saat slotları üret — kapalı slotları hariç tut
function generateSlots(musaitlik: Musaitlik | undefined): string[] {
  if (!musaitlik || !musaitlik.aktif) return []
  const kapali = new Set(musaitlik.kapaliSlotlar ?? [])
  const slots: string[] = []
  const [startH, startM] = musaitlik.baslangic.split(":").map(Number)
  const [endH, endM] = musaitlik.bitis.split(":").map(Number)
  let totalMin = startH * 60 + startM
  const endMin = endH * 60 + endM
  while (totalMin + musaitlik.slotDk <= endMin) {
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    const slot = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    if (!kapali.has(slot)) slots.push(slot)
    totalMin += musaitlik.slotDk
  }
  return slots
}

// JS Date → haftanın günü (1=Pzt, 5=Cuma, 6=Cmt, 7=Pzr)
function getIsoWeekday(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00")
  return d.getDay() === 0 ? 7 : d.getDay()
}

interface RandevuDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  danisanId?: string
  danisanAd?: string
  initialDate?: Date
  onScheduled?: () => void
  onSkip?: () => void
}

export function RandevuDialog({
  open, onOpenChange, danisanId, danisanAd, initialDate, onScheduled, onSkip,
}: RandevuDialogProps) {
  const { data: allDanisanlar } = useCollection("danisanlar")
  const { data: musaitlikData } = useCollection("musaitlik")
  const mudurlukMap = useMudurlukMap()
  const updateDanisan = useUpdateRecord("danisanlar")

  const todayStr = new Date().toISOString().split("T")[0]
  const defaultDate = initialDate
    ? initialDate.toISOString().split("T")[0]
    : (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0] })()

  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [selectedTime, setSelectedTime] = useState("")
  const [manuelTime, setManuelTime] = useState("")
  const [selectedDanisanId, setSelectedDanisanId] = useState(danisanId ?? "")
  const [search, setSearch] = useState("")

  const effectiveTime = manuelTime || selectedTime

  // Seçili güne ait müsaitlik
  const dayMusaitlik = useMemo(() => {
    if (!selectedDate || !musaitlikData) return undefined
    const weekday = getIsoWeekday(selectedDate)
    return musaitlikData.find((m: Musaitlik) => m.gun === weekday)
  }, [selectedDate, musaitlikData])

  // Dinamik saat slotları — müsaitlik verisinden
  const saatSlotlari = useMemo(() => generateSlots(dayMusaitlik), [dayMusaitlik])

  // Hafta sonu veya müsait olmayan gün mü?
  const isDayOff = !dayMusaitlik || !dayMusaitlik.aktif

  // Seçilen danışanın mevcut randevusu
  const selectedDanisan = useMemo(() =>
    allDanisanlar?.find((d: Danisan) => d.id === selectedDanisanId),
    [allDanisanlar, selectedDanisanId]
  )

  // Danışan arama — arama yazılınca filtrele, boşken gösterme
  const filteredDanisanlar = useMemo(() => {
    if (!allDanisanlar || !search.trim()) return []
    const q = search.toLowerCase()
    return allDanisanlar
      .filter((d: Danisan) =>
        d.adSoyad.toLowerCase().includes(q) ||
        String(d.sicilNo).includes(q) ||
        (mudurlukMap.get(d.mudurlukId)?.mudurlukAdi ?? "").toLowerCase().includes(q)
      )
      .slice(0, 50) // İlk 50 eşleşme — performans için
  }, [allDanisanlar, search, mudurlukMap])

  // Çakışma kontrolü
  const conflicts = useMemo(() => {
    if (!selectedDate || !effectiveTime || !allDanisanlar) return []
    const target = `${selectedDate}T${effectiveTime}`
    return allDanisanlar.filter((d: Danisan) =>
      d.sonrakiRandevu?.startsWith(target) && d.id !== selectedDanisanId
    )
  }, [selectedDate, effectiveTime, allDanisanlar, selectedDanisanId])

  // O gündeki tüm randevular (saat doluluk gösterimi)
  const dayAppointments = useMemo(() => {
    if (!selectedDate || !allDanisanlar) return []
    return allDanisanlar.filter((d: Danisan) => d.sonrakiRandevu?.startsWith(selectedDate))
  }, [selectedDate, allDanisanlar])

  const busyTimes = useMemo(() => {
    const set = new Set<string>()
    for (const d of dayAppointments) {
      const t = d.sonrakiRandevu?.split("T")[1]?.slice(0, 5)
      if (t) set.add(t)
    }
    return set
  }, [dayAppointments])

  // Seçilen saat müsaitlik aralığında mı?
  const isTimeInRange = useMemo(() => {
    if (!effectiveTime || !dayMusaitlik || !dayMusaitlik.aktif) return false
    return effectiveTime >= dayMusaitlik.baslangic && effectiveTime < dayMusaitlik.bitis
  }, [effectiveTime, dayMusaitlik])

  const handleSave = async () => {
    if (!selectedDanisanId || !selectedDate || !effectiveTime) return
    const iso = `${selectedDate}T${effectiveTime}:00`
    await updateDanisan.mutateAsync({
      id: selectedDanisanId,
      data: { sonrakiRandevu: iso },
    })
    onScheduled?.()
    onOpenChange(false)
  }

  const handleSkip = () => {
    onSkip?.()
    onOpenChange(false)
  }

  const canSave = !!selectedDanisanId && !!selectedDate && !!effectiveTime

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md!">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Randevu Planla
          </DialogTitle>
          <DialogDescription>
            {danisanAd
              ? `${danisanAd} için sonraki randevuyu belirleyin.`
              : "Danışan seçip randevu oluşturun."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Danışan arama — sadece danisanId yoksa */}
          {!danisanId && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Danışan</label>
              {selectedDanisanId && selectedDanisan ? (
                <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: getKademeStyle(selectedDanisan.triyajKademesi).text }}>
                    {selectedDanisan.adSoyad.split(" ").map(p => p[0]).join("").slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium flex-1">{selectedDanisan.adSoyad}</span>
                  <button onClick={() => { setSelectedDanisanId(""); setSearch("") }}
                    className="text-xs text-muted-foreground hover:text-foreground">Değiştir</button>
                </div>
              ) : (
                <Command className="rounded-lg border border-border" shouldFilter={false}>
                  <CommandInput placeholder="Ad, sicil no veya müdürlük ile ara..." value={search} onValueChange={setSearch} />
                  <CommandList className="max-h-40">
                    {search.trim().length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Aramaya başlayın... ({allDanisanlar?.length ?? 0} kişi)</p>
                    ) : filteredDanisanlar.length === 0 ? (
                      <CommandEmpty>Danışan bulunamadı.</CommandEmpty>
                    ) : (
                      filteredDanisanlar.map((d: Danisan) => {
                        const ks = getKademeStyle(d.triyajKademesi)
                        return (
                          <CommandItem
                            key={d.id}
                            value={d.id}
                            onSelect={() => { setSelectedDanisanId(d.id); setSearch("") }}
                          >
                            <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                              style={{ background: ks.text }}>
                              {d.adSoyad.split(" ").map(p => p[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm">{d.adSoyad}</span>
                              <span className="text-xs text-muted-foreground ml-2">#{d.sicilNo}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                              {mudurlukMap.get(d.mudurlukId)?.mudurlukAdi ?? ""}
                            </span>
                          </CommandItem>
                        )
                      })
                    )}
                  </CommandList>
                </Command>
              )}
            </div>
          )}

          {/* Tarih */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tarih</label>
            <input
              type="date"
              value={selectedDate}
              min={todayStr}
              onChange={e => { setSelectedDate(e.target.value); setSelectedTime(""); setManuelTime("") }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            {isDayOff && selectedDate && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-red-600">
                <Ban className="w-3 h-3" />
                Bu gün müsaitlik tanımlı değil (tatil veya kapalı gün).
              </div>
            )}
          </div>

          {/* Saat */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              <Clock className="w-3 h-3 inline -mt-0.5 mr-1" />Saat
              {dayMusaitlik?.aktif && (
                <span className="font-normal text-muted-foreground/60 ml-1.5">
                  ({dayMusaitlik.baslangic}–{dayMusaitlik.bitis}, {dayMusaitlik.slotDk}dk slot)
                </span>
              )}
            </label>
            {saatSlotlari.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {saatSlotlari.map(saat => {
                  const busy = busyTimes.has(saat)
                  const active = selectedTime === saat && !manuelTime
                  return (
                    <button
                      key={saat}
                      type="button"
                      onClick={() => { setSelectedTime(saat); setManuelTime("") }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                        active
                          ? "bg-primary text-white border-primary"
                          : busy
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {saat}
                      {busy && !active && <span className="ml-0.5 text-[9px]">!</span>}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic mb-2">
                {isDayOff ? "Bu güne ait müsaitlik yok." : "Saat slotları yükleniyor..."}
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">veya:</span>
              <input
                type="time"
                value={manuelTime}
                onChange={e => setManuelTime(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {/* Manuel saat müsaitlik dışında uyarısı */}
            {effectiveTime && !isDayOff && !isTimeInRange && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-700">
                <AlertTriangle className="w-3 h-3" />
                Bu saat müsaitlik aralığı ({dayMusaitlik?.baslangic}–{dayMusaitlik?.bitis}) dışında.
              </div>
            )}
          </div>

          {/* Uyarılar */}
          {selectedDanisan?.sonrakiRandevu && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Mevcut randevu ({new Date(selectedDanisan.sonrakiRandevu).toLocaleDateString("tr-TR")}
                {selectedDanisan.sonrakiRandevu.includes("T") && `, ${selectedDanisan.sonrakiRandevu.split("T")[1]?.slice(0, 5)}`})
                değiştirilecek.
              </span>
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Bu saatte {conflicts.length} randevu var: {conflicts.map(c => c.adSoyad).join(", ")}
              </span>
            </div>
          )}

          {/* O gün kaç randevu var — özet */}
          {dayAppointments.length > 0 && (
            <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-md px-3 py-1.5">
              {selectedDate && new Date(selectedDate + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" })} — {dayAppointments.length} randevu mevcut
            </div>
          )}
        </div>

        <DialogFooter>
          {onSkip && (
            <Button variant="ghost" onClick={handleSkip} className="mr-auto">
              Atla
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!canSave || updateDanisan.isPending}
          >
            {updateDanisan.isPending ? "Kaydediliyor..." : "Randevu Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
