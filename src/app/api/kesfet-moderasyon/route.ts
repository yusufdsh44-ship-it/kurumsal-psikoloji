import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const { data, error } = await supabase
    .from("kesfet_paylasimlar")
    .select("*")
    .order("olusturma_tarihi", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const paylasimlar = (data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id,
    adSoyad: p.ad_soyad,
    mudurluk: p.mudurluk,
    anonim: p.anonim,
    kitapAdi: p.kitap_adi,
    yazar: p.yazar,
    alinti: p.alinti,
    yorum: p.yorum,
    olusturmaTarihi: p.olusturma_tarihi,
    onaylandi: p.onaylandi,
    psikologBegeni: p.psikolog_begeni,
    likeSayisi: p.like_sayisi,
    kaynak: p.kaynak,
  }))

  return NextResponse.json(paylasimlar)
}

// Psikolog paylaşımı oluştur (otomatik onaylı)
export async function POST(request: NextRequest) {
  const body = await request.json()

  const kitapAdi = typeof body.kitapAdi === "string" ? body.kitapAdi.trim() : ""
  const yazar = typeof body.yazar === "string" ? body.yazar.trim() : ""
  const alinti = typeof body.alinti === "string" ? body.alinti.trim() : ""

  if (!kitapAdi) return NextResponse.json({ error: "Kitap adı gerekli" }, { status: 400 })
  if (!yazar) return NextResponse.json({ error: "Yazar gerekli" }, { status: 400 })
  if (!alinti || alinti.length < 10) return NextResponse.json({ error: "Alıntı en az 10 karakter olmalı" }, { status: 400 })

  const { error } = await supabase.from("kesfet_paylasimlar").insert({
    ad_soyad: "Uzm. Kl. Psk. Yusuf Pamuk",
    mudurluk: "Kurumsal Psikoloji Birimi",
    anonim: false,
    kitap_adi: body.kitapAdi,
    yazar: body.yazar,
    alinti: body.alinti,
    yorum: body.yorum || null,
    onaylandi: true,
    kaynak: "psikolog",
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 })

  const dbUpdates: Record<string, unknown> = {}
  if ("onaylandi" in updates) dbUpdates.onaylandi = updates.onaylandi
  if ("psikologBegeni" in updates) dbUpdates.psikolog_begeni = updates.psikologBegeni

  const { error } = await supabase
    .from("kesfet_paylasimlar")
    .update(dbUpdates)
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 })

  const { error } = await supabase.from("kesfet_paylasimlar").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
