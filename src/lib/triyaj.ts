import { KADEME_RENK, BFI_KADEME_RENK, DURUM_RENK } from "./constants"

export function getKademeStyle(kademe: number | null) {
  if (!kademe) return { text: "#78716C", bg: "#F5F0EB", label: "Belirsiz" }
  return KADEME_RENK[kademe] ?? { text: "#78716C", bg: "#F5F0EB", label: "Belirsiz" }
}

export function getBfiKademeStyle(kademe: string | null) {
  if (!kademe) return { text: "#78716C", bg: "#F5F0EB", label: "Belirsiz" }
  return BFI_KADEME_RENK[kademe] ?? { text: "#78716C", bg: "#F5F0EB", label: "Belirsiz" }
}

export function getDurumStyle(durum: string) {
  return DURUM_RENK[durum] ?? { text: "#78716C", bg: "#F5F0EB" }
}

export function getInitials(adSoyad: string): string {
  const parts = adSoyad.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? ""
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function getKademeFromGsi(gsi: number, kritikMadde?: boolean): number {
  if (kritikMadde || gsi >= 2.5) return 1
  if (gsi >= 1.5) return 2
  if (gsi >= 1.0) return 3
  if (gsi >= 0.5) return 4
  return 5
}

export function getRiskSeviyesi(denge: number | null): "Yüksek" | "Orta" | "Düşük" {
  if (denge === null) return "Düşük"
  if (denge < 0) return "Yüksek"
  if (denge <= 10) return "Orta"
  return "Düşük"
}

// ── Bileşik Müdürlük Risk Skoru ──────────────────────

export interface DeptRiskInput {
  denge: number | null
  ruhSagligiRiski: number | null
  genelMemnuniyet: number | null
  avgGsi: number | null
  kritikVakaSayisi: number
  toplamPersonel: number
}

export interface RiskBilesen {
  ad: string
  skor: number      // 0-100 normalize
  agirlik: number   // 0-1 arasi
  katki: number     // skor * agirlik
  mevcut: boolean   // veri var mi
}

export interface DeptRiskResult {
  score: number
  seviye: "Yüksek" | "Orta" | "Düşük"
  bilesenler: RiskBilesen[]
}

export function computeDepartmentRisk(input: DeptRiskInput): DeptRiskResult {
  const BELEDIYE_DENGE = 13.2

  const raw: { ad: string; skor: number | null; agirlik: number }[] = [
    {
      ad: "Denge (Anket)",
      agirlik: 0.20,
      skor: input.denge != null
        ? Math.max(0, Math.min(100, (BELEDIYE_DENGE - input.denge) / BELEDIYE_DENGE * 50 + 50))
        : null,
    },
    {
      ad: "Ruh S. Riski (Anket)",
      agirlik: 0.20,
      skor: input.ruhSagligiRiski != null ? input.ruhSagligiRiski : null,
    },
    {
      ad: "Memnuniyet (Anket)",
      agirlik: 0.15,
      skor: input.genelMemnuniyet != null ? Math.max(0, 100 - input.genelMemnuniyet) : null,
    },
    {
      ad: "GSI Ortalaması (KSE-53)",
      agirlik: 0.25,
      skor: input.avgGsi != null ? Math.min(100, (input.avgGsi / 2.5) * 100) : null,
    },
    {
      ad: "Kritik Vaka Oranı (K1+K2)",
      agirlik: 0.20,
      skor: input.toplamPersonel > 0
        ? Math.min(100, (input.kritikVakaSayisi / input.toplamPersonel) * 100)
        : null,
    },
  ]

  // Mevcut bilesenleri filtrele, agirliklari normalize et
  const mevcut = raw.filter(b => b.skor !== null)
  const toplamAgirlik = mevcut.reduce((s, b) => s + b.agirlik, 0) || 1

  const bilesenler: RiskBilesen[] = raw.map(b => {
    const normalAgirlik = b.skor !== null ? b.agirlik / toplamAgirlik : 0
    return {
      ad: b.ad,
      skor: b.skor !== null ? Math.round(b.skor * 10) / 10 : 0,
      agirlik: Math.round(normalAgirlik * 100) / 100,
      katki: b.skor !== null ? Math.round(b.skor * normalAgirlik * 10) / 10 : 0,
      mevcut: b.skor !== null,
    }
  })

  const score = Math.round(bilesenler.reduce((s, b) => s + b.katki, 0) * 10) / 10
  const seviye = score >= 60 ? "Yüksek" as const : score >= 35 ? "Orta" as const : "Düşük" as const

  return { score, seviye, bilesenler }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/müdürlüğü$/g, "")
    .replace(/-$/g, "")
}

export function formatDate(date: string | null): string {
  if (!date) return "—"
  try {
    return new Date(date).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch {
    return date
  }
}

export function formatDateTime(date: string | null): string {
  if (!date) return "—"
  try {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return date
  }
}
