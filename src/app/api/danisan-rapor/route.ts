import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { nanoid } from "nanoid"

// POST: Rapor oluştur veya güncelle
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { referansKodu, adSoyad, raporTuru, icerik, ozet } = body

  if (!referansKodu || !adSoyad || !raporTuru || !icerik) {
    return NextResponse.json({ error: "referansKodu, adSoyad, raporTuru ve icerik zorunludur" }, { status: 400 })
  }

  const id = `rapor_${nanoid(8)}`

  const { error } = await supabase.from("danisan_raporlari").insert({
    id,
    referans_kodu: referansKodu,
    ad_soyad: adSoyad,
    rapor_turu: raporTuru,
    icerik,
    ozet: ozet || null,
    gorunur: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id, referansKodu }, { status: 201 })
}

// GET: Referans koduna göre raporları getir
export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref")
  if (!ref) {
    return NextResponse.json({ error: "ref parametresi gerekli" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("danisan_raporlari")
    .select("id, referans_kodu, ad_soyad, rapor_turu, icerik, ozet, olusturma_tarihi")
    .eq("referans_kodu", ref)
    .eq("gorunur", true)
    .order("olusturma_tarihi", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
