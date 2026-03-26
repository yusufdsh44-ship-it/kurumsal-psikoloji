import { NextResponse } from 'next/server'
import { readCollection } from '@/lib/api'
import type { Musaitlik, Danisan, RandevuTalebi } from '@/types'

// Haftanın gününü hesapla (1=Pzt ... 5=Cum, 6=Cmt, 0=Paz)
function getWeekday(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDay() === 0 ? 7 : d.getDay()
}

export async function GET() {
  const musaitlik = await readCollection<Musaitlik>('musaitlik')
  const danisanlar = await readCollection<Danisan>('danisanlar')
  const talepler = await readCollection<RandevuTalebi>('randevuTalepleri')

  const doluSlotlar = new Set<string>()

  // 1. Danışan randevuları
  for (const d of danisanlar) {
    if (d.sonrakiRandevu) {
      const date = d.sonrakiRandevu.split('T')[0]
      const time = d.sonrakiRandevu.split('T')[1]?.slice(0, 5)
      if (date && time) doluSlotlar.add(`${date}_${time}`)
    }
  }

  // 2. Bekleyen/onaylı talepler
  for (const t of talepler) {
    if (t.durum !== 'Reddedildi') {
      doluSlotlar.add(`${t.istenenTarih}_${t.istenenSaat}`)
    }
  }

  // 3. Kapalı slotları gelecek 21 günün tarihlerine yay
  const today = new Date()
  for (let i = 0; i <= 21; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const weekday = getWeekday(dateStr)
    const dayConfig = musaitlik.find(m => m.gun === weekday)

    if (dayConfig?.aktif && dayConfig.kapaliSlotlar?.length) {
      for (const slot of dayConfig.kapaliSlotlar) {
        doluSlotlar.add(`${dateStr}_${slot}`)
      }
    }
  }

  return NextResponse.json({
    musaitlik,
    doluSlotlar: Array.from(doluSlotlar),
  })
}
