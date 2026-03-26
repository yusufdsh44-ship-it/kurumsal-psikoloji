import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { readCollection, writeCollection } from "@/lib/api"
import type { Musaitlik, RandevuTalebi } from "@/types"

// GET: Supabase'den talepleri çek → local JSON'a yaz
// POST: Local müsaitliği Supabase'e push et
export async function GET() {
  try {
    // Supabase'den talepleri çek
    const { data: rows, error } = await supabase
      .from("randevu_talepleri")
      .select("*")
      .order("olusturma_tarihi", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Supabase formatından local formata dönüştür
    const talepler: RandevuTalebi[] = (rows ?? []).map(r => ({
      id: r.id,
      adSoyad: r.ad_soyad,
      telefon: r.telefon,
      mudurluk: r.mudurluk,
      gorusmeTuru: r.gorusme_turu,
      not: r.not_text ?? "",
      istenenTarih: r.istenen_tarih,
      istenenSaat: r.istenen_saat,
      olusturmaTarihi: r.olusturma_tarihi,
      durum: r.durum,
      kaynak: r.kaynak,
    }))

    // Local JSON'a yaz
    await writeCollection("randevuTalepleri", talepler)

    return NextResponse.json({ synced: talepler.length })
  } catch (e) {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    // Müsaitliği Supabase'e push et
    if (action === "push-musaitlik") {
      const localMusaitlik = await readCollection<Musaitlik>("musaitlik")

      for (const m of localMusaitlik) {
        await supabase.from("musaitlik").upsert({
          id: m.id,
          gun: m.gun,
          baslangic: m.baslangic,
          bitis: m.bitis,
          slot_dk: m.slotDk,
          aktif: m.aktif,
          kapali_slotlar: m.kapaliSlotlar ?? [],
        })
      }

      return NextResponse.json({ pushed: localMusaitlik.length })
    }

    // Talep durumunu Supabase'de güncelle
    if (action === "update-talep" && data?.id && data?.durum) {
      const { error } = await supabase
        .from("randevu_talepleri")
        .update({ durum: data.durum })
        .eq("id", data.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ updated: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
