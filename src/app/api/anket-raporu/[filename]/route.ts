import { NextResponse } from 'next/server'
import { readAnketRaporuHtml } from '@/lib/api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  if (!filename.endsWith('.html') || filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Geçersiz dosya adı' }, { status: 400 })
  }

  const content = await readAnketRaporuHtml(filename)

  if (content === null) {
    return NextResponse.json({ error: 'Rapor bulunamadı' }, { status: 404 })
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
