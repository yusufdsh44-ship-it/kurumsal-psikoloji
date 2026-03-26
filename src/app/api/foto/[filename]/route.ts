import { NextResponse } from 'next/server'
import { readFoto } from '@/lib/api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  if (filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Geçersiz dosya adı' }, { status: 400 })
  }

  const buffer = await readFoto(filename)

  if (!buffer) {
    return NextResponse.json({ error: 'Fotoğraf bulunamadı' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=604800',
    },
  })
}
