import { NextResponse } from 'next/server'
import { readCollection } from '@/lib/api'

export async function GET() {
  const [danisanlar, mudurlukler, testSonuclari, seansPlanlari, gorusmeNotlari, randevuTalepleri, musaitlik, sevkler, mesajlar] =
    await Promise.all([
      readCollection('danisanlar'),
      readCollection('mudurlukler'),
      readCollection('testSonuclari'),
      readCollection('seansPlanlari'),
      readCollection('gorusmeNotlari'),
      readCollection('randevuTalepleri'),
      readCollection('musaitlik'),
      readCollection('sevkler'),
      readCollection('mesajlar'),
    ])

  return NextResponse.json({
    danisanlar,
    mudurlukler,
    testSonuclari,
    seansPlanlari,
    gorusmeNotlari,
    randevuTalepleri,
    musaitlik,
    sevkler,
    mesajlar,
  })
}
