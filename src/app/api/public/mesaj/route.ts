import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase"

const mesajSchema = z.object({
  anonim: z.boolean(),
  adSoyad: z.string().nullable(),
  mudurluk: z.string().nullable(),
  email: z.string().email().nullable().or(z.literal("")),
  kategori: z.enum([
    "Görüşme Hakkında Soru",
    "Öneri / Geri Bildirim",
    "Şikayet",
    "Genel Soru",
    "Acil Destek Talebi",
  ]),
  mesaj: z.string().min(1, "Mesaj boş olamaz").max(5000),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })
  }

  const result = mesajSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: "Validasyon hatası", details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { anonim, adSoyad, mudurluk, email, kategori, mesaj } = result.data

  if (!anonim && (!adSoyad || !mudurluk)) {
    return NextResponse.json(
      { error: "Kimlikli mesajda ad soyad ve müdürlük zorunludur" },
      { status: 400 }
    )
  }

  const { error } = await supabase.from("mesajlar").insert({
    anonim,
    ad_soyad: anonim ? null : adSoyad,
    mudurluk: anonim ? null : mudurluk,
    email: email || null,
    kategori,
    mesaj,
  })

  if (error) {
    console.error("[public/mesaj] Supabase insert error:", error.message)
    return NextResponse.json({ error: "Mesaj kaydedilemedi" }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
