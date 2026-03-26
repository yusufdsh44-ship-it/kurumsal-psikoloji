import { NextResponse } from 'next/server'
import { readPdfFile } from '@/lib/api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params
  const filePath = pathSegments.join('/')

  if (!filePath.endsWith('.pdf')) {
    return NextResponse.json({ error: 'Yalnızca PDF dosyaları sunulabilir' }, { status: 400 })
  }

  const buffer = await readPdfFile(filePath)

  if (!buffer) {
    return NextResponse.json({ error: 'PDF dosyası bulunamadı' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${pathSegments[pathSegments.length - 1]}"`,
    },
  })
}
