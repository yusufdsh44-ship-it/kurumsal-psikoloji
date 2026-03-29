import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const { data, error } = await supabase
    .from("mesajlar")
    .select("*")
    .order("olusturma_tarihi", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // snake_case → camelCase mapping
  const mesajlar = (data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id,
    anonim: m.anonim,
    adSoyad: m.ad_soyad,
    mudurluk: m.mudurluk,
    email: m.email,
    kategori: m.kategori,
    mesaj: m.mesaj,
    okundu: m.okundu,
    olusturmaTarihi: m.olusturma_tarihi,
    cevap: m.cevap,
    cevapTarihi: m.cevap_tarihi,
  }))

  return NextResponse.json(mesajlar)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: "ID gerekli" }, { status: 400 })
  }

  // camelCase → snake_case mapping
  const dbUpdates: Record<string, unknown> = {}
  if ("okundu" in updates) dbUpdates.okundu = updates.okundu
  if ("cevap" in updates) {
    dbUpdates.cevap = updates.cevap
    dbUpdates.cevap_tarihi = new Date().toISOString()
  }

  const { error } = await supabase
    .from("mesajlar")
    .update(dbUpdates)
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
