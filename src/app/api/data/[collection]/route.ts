import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { readCollection, writeCollection } from '@/lib/api'

const VALID_COLLECTIONS = ['danisanlar', 'mudurlukler', 'testSonuclari', 'seansPlanlari', 'gorusmeNotlari', 'randevuTalepleri', 'musaitlik', 'sevkler', 'mesajlar'] as const
type CollectionName = (typeof VALID_COLLECTIONS)[number]

function isValidCollection(name: string): name is CollectionName {
  return VALID_COLLECTIONS.includes(name as CollectionName)
}

// --- Zod Schemas (POST validasyonu — zorunlu alanlar) ---

const danisanSchema = z.object({
  id: z.string().min(1),
  sicilNo: z.number().int(),
  adSoyad: z.string().min(1),
  mudurlukId: z.string().min(1),
}).passthrough()

const testSonucuSchema = z.object({
  id: z.string().min(1),
  danisanId: z.string().min(1),
  testTuru: z.enum(["KSE-53", "BFI-2", "Birleşik"]),
  uygulamaTarihi: z.string().min(1),
}).passthrough()

const gorusmeNotuSchema = z.object({
  id: z.string().min(1),
  danisanId: z.string().min(1),
  tarih: z.string().min(1),
  gorusmeNo: z.number().int(),
}).passthrough()

const seansPlanSchema = z.object({
  id: z.string().min(1),
  danisanId: z.string().min(1),
}).passthrough()

const randevuTalebiSchema = z.object({
  id: z.string().min(1),
  adSoyad: z.string().min(1),
  istenenTarih: z.string().min(1),
}).passthrough()

const mudurlukSchema = z.object({
  id: z.string().min(1),
  mudurlukAdi: z.string().min(1),
}).passthrough()

const musaitlikSchema = z.object({
  id: z.string().min(1),
  gun: z.number().int().min(1).max(7),
}).passthrough()

const sevkSchema = z.object({
  id: z.string().min(1),
  danisanId: z.string().min(1),
  sevkTarihi: z.string().min(1),
  sevkYeri: z.string().min(1),
}).passthrough()

const mesajSchema = z.object({
  id: z.string().min(1),
  anonim: z.boolean(),
  mesaj: z.string().min(1),
  kategori: z.string().min(1),
}).passthrough()

const SCHEMAS: Record<CollectionName, z.ZodTypeAny> = {
  danisanlar: danisanSchema,
  mudurlukler: mudurlukSchema,
  testSonuclari: testSonucuSchema,
  seansPlanlari: seansPlanSchema,
  gorusmeNotlari: gorusmeNotuSchema,
  randevuTalepleri: randevuTalebiSchema,
  musaitlik: musaitlikSchema,
  sevkler: sevkSchema,
  mesajlar: mesajSchema,
}

// PUT validasyonu daha gevşek — partial update
const PARTIAL_SCHEMAS: Record<CollectionName, z.ZodTypeAny> = {
  danisanlar: danisanSchema.partial(),
  mudurlukler: mudurlukSchema.partial(),
  testSonuclari: testSonucuSchema.partial(),
  seansPlanlari: seansPlanSchema.partial(),
  gorusmeNotlari: gorusmeNotuSchema.partial(),
  randevuTalepleri: randevuTalebiSchema.partial(),
  musaitlik: musaitlikSchema.partial(),
  sevkler: sevkSchema.partial(),
  mesajlar: mesajSchema.partial(),
}

// --- Handlers ---

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params

  if (!isValidCollection(collection)) {
    return NextResponse.json({ error: 'Geçersiz koleksiyon adı' }, { status: 400 })
  }

  const data = await readCollection<Record<string, unknown>>(collection)
  const id = request.nextUrl.searchParams.get('id')

  if (id) {
    const record = data.find(item => item.id === id)
    if (!record) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
    }
    return NextResponse.json(record)
  }

  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params

  if (!isValidCollection(collection)) {
    return NextResponse.json({ error: 'Geçersiz koleksiyon adı' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const schema = SCHEMAS[collection]
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Validasyon hatası', details: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = await readCollection<Record<string, unknown>>(collection)
  data.push(result.data as Record<string, unknown>)
  await writeCollection(collection, data)

  return NextResponse.json(result.data, { status: 201 })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params

  if (!isValidCollection(collection)) {
    return NextResponse.json({ error: 'Geçersiz koleksiyon adı' }, { status: 400 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id parametresi gerekli' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const schema = PARTIAL_SCHEMAS[collection]
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Validasyon hatası', details: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = await readCollection<Record<string, unknown>>(collection)
  const index = data.findIndex(item => item.id === id)

  if (index === -1) {
    return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
  }

  data[index] = { ...data[index], ...result.data as Record<string, unknown> }
  await writeCollection(collection, data)

  return NextResponse.json(data[index])
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params

  if (!isValidCollection(collection)) {
    return NextResponse.json({ error: 'Geçersiz koleksiyon adı' }, { status: 400 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id parametresi gerekli' }, { status: 400 })
  }

  const data = await readCollection<Record<string, unknown>>(collection)
  const index = data.findIndex(item => item.id === id)

  if (index === -1) {
    return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
  }

  const removed = data.splice(index, 1)[0]
  await writeCollection(collection, data)

  return NextResponse.json(removed)
}
