import { NextRequest, NextResponse } from 'next/server'
import { readMarkdownReport, writeMarkdownReport } from '@/lib/api'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const content = await readMarkdownReport(slug)

  if (content === null) {
    return NextResponse.json({ error: 'Rapor bulunamadı' }, { status: 404 })
  }

  return NextResponse.json({ content })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json()

  if (!body || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'content alanı gerekli (string)' }, { status: 400 })
  }

  await writeMarkdownReport(slug, body.content)

  return NextResponse.json({ success: true, slug })
}
