import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { readCollection, writeCollection } from "@/lib/api"
import { nanoid } from "nanoid"

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

  // Kimlikli ise ad ve müdürlük zorunlu
  if (!anonim && (!adSoyad || !mudurluk)) {
    return NextResponse.json(
      { error: "Kimlikli mesajda ad soyad ve müdürlük zorunludur" },
      { status: 400 }
    )
  }

  const record = {
    id: nanoid(),
    anonim,
    adSoyad: anonim ? null : adSoyad,
    mudurluk: anonim ? null : mudurluk,
    email: email || null,
    kategori,
    mesaj,
    okundu: false,
    olusturmaTarihi: new Date().toISOString(),
    cevap: null,
    cevapTarihi: null,
  }

  // Local JSON'a kaydet
  const data = await readCollection<Record<string, unknown>>("mesajlar")
  data.push(record)
  await writeCollection("mesajlar", data)

  return NextResponse.json({ ok: true, id: record.id }, { status: 201 })
}
