"use client"

import { useMemo, useState, useEffect } from "react"
import { useCollection } from "@/hooks/use-data"
import { getKademeStyle, getBfiKademeStyle, formatDate } from "@/lib/triyaj"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Download, FileText, RefreshCw, ClipboardCheck } from "lucide-react"
import type { TestSonucu, Danisan } from "@/types"

interface OnlineTest {
  id: string
  ad_soyad: string
  mudurluk: string
  test_turu: string
  tarih: string
}

interface MergedRow {
  key: string
  adSoyad: string
  mudurluk: string
  testTuru: string
  tarih: string
  // Ham veri (Supabase)
  onlineId: string | null
  // Klinik sonuç (local)
  klinik: TestSonucu | null
  // Danışan eşleştirme
  danisan: Danisan | null
}

export default function TestlerPage() {
  const { data: testler, isLoading } = useCollection("testSonuclari")
  const { data: danisanlar } = useCollection("danisanlar")
  const [onlineTestler, setOnlineTestler] = useState<OnlineTest[]>([])
  const [loadingOnline, setLoadingOnline] = useState(true)
  const [filter, setFilter] = useState<"all" | "KSE-53" | "BFI-2">("all")

  useEffect(() => {
    fetch("/api/online-testler")
      .then(r => r.json())
      .then(data => setOnlineTestler(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingOnline(false))
  }, [])

  const refresh = () => {
    setLoadingOnline(true)
    fetch("/api/online-testler")
      .then(r => r.json())
      .then(data => setOnlineTestler(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingOnline(false))
  }

  const findDanisan = (adSoyad: string): Danisan | null => {
    if (!danisanlar) return null
    return danisanlar.find(d => d.adSoyad.toLowerCase() === adSoyad.toLowerCase()) ?? null
  }

  // İki kaynağı birleştir
  const merged = useMemo(() => {
    const rows = new Map<string, MergedRow>()

    // 1. Online testleri ekle
    for (const o of onlineTestler) {
      const key = `${o.ad_soyad.toLowerCase()}_${o.test_turu}`
      const existing = rows.get(key)
      if (existing) {
        existing.onlineId = o.id
        if (!existing.tarih) existing.tarih = o.tarih
      } else {
        rows.set(key, {
          key,
          adSoyad: o.ad_soyad,
          mudurluk: o.mudurluk,
          testTuru: o.test_turu,
          tarih: o.tarih,
          onlineId: o.id,
          klinik: null,
          danisan: findDanisan(o.ad_soyad),
        })
      }
    }

    // 2. Klinik sonuçları ekle/birleştir
    for (const t of testler ?? []) {
      const d = danisanlar?.find(da => da.id === t.danisanId)
      if (!d) continue
      const key = `${d.adSoyad.toLowerCase()}_${t.testTuru}`
      const existing = rows.get(key)
      if (existing) {
        existing.klinik = t
        existing.danisan = d
      } else {
        rows.set(key, {
          key,
          adSoyad: d.adSoyad,
          mudurluk: "",
          testTuru: t.testTuru,
          tarih: t.uygulamaTarihi,
          onlineId: null,
          klinik: t,
          danisan: d,
        })
      }
    }

    let result = Array.from(rows.values())
    if (filter !== "all") result = result.filter(r => r.testTuru === filter)
    return result.sort((a, b) => (b.tarih ?? "").localeCompare(a.tarih ?? ""))
  }, [onlineTestler, testler, danisanlar, filter, findDanisan])

  const loading = isLoading || loadingOnline

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Test Sonuçları" }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Test Sonuçları</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refresh} className="h-8 w-8 p-0">
            <RefreshCw className={`w-4 h-4 ${loadingOnline ? "animate-spin" : ""}`} />
          </Button>
          <a href="/api/test-excel" download>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Download className="w-3.5 h-3.5 mr-1" /> Tüm Ham Verileri İndir
            </Button>
          </a>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(["all", "KSE-53", "BFI-2"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 font-medium transition-colors ${filter === f ? "bg-primary text-white" : "hover:bg-muted"}`}>
              {f === "all" ? `Tümü (${merged.length})` : f}
            </button>
          ))}
        </div>
      </div>

      {/* Tek birleşik tablo */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : merged.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Henüz test sonucu bulunmuyor.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-3 text-sm font-medium text-muted-foreground">Kişi</th>
                  <th className="text-left py-2.5 px-3 text-sm font-medium text-muted-foreground">Müdürlük</th>
                  <th className="text-center py-2.5 px-3 text-sm font-medium text-muted-foreground">Test</th>
                  <th className="text-center py-2.5 px-3 text-sm font-medium text-muted-foreground">Kademe</th>
                  <th className="text-left py-2.5 px-3 text-sm font-medium text-muted-foreground">Tarih</th>
                  <th className="text-center py-2.5 px-3 text-sm font-medium text-muted-foreground">Dosyalar</th>
                </tr>
              </thead>
              <tbody>
                {merged.map(row => {
                  const ks = row.danisan ? getKademeStyle(row.danisan.triyajKademesi) : null
                  const klinikKademe = row.klinik?.kademe
                  const kademeStyle = klinikKademe
                    ? (row.testTuru !== "BFI-2" ? getKademeStyle(Number(klinikKademe)) : getBfiKademeStyle(klinikKademe))
                    : null
                  const tarih = row.tarih ? new Date(row.tarih).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"

                  return (
                    <tr key={row.key} className="border-b border-border/40 hover:bg-muted/50 transition-colors">
                      {/* Kişi */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {row.danisan ? (
                            <Link href={`/danisanlar/${row.danisan.id}`} className="flex items-center gap-2.5 group">
                              <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ background: ks!.text }}>
                                {row.adSoyad.split(" ").map(p => p[0]).join("").slice(0, 2)}
                              </div>
                              <span className="text-sm font-medium group-hover:text-primary transition-colors">{row.adSoyad}</span>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                                {row.adSoyad.split(" ").map(p => p[0]).join("").slice(0, 2)}
                              </div>
                              <span className="text-sm font-medium">{row.adSoyad}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Müdürlük */}
                      <td className="py-2.5 px-3 text-sm text-muted-foreground truncate max-w-[180px]">
                        {row.mudurluk || (row.danisan ? "—" : "")}
                      </td>

                      {/* Test türü */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          row.testTuru === "KSE-53" ? "bg-amber-50 text-amber-700" :
                          row.testTuru === "BFI-2" ? "bg-blue-50 text-blue-700" :
                          "bg-muted text-muted-foreground"
                        }`}>{row.testTuru}</span>
                      </td>

                      {/* Kademe (sadece klinik sonuç varsa) */}
                      <td className="py-2.5 px-3 text-center">
                        {kademeStyle && klinikKademe ? (
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                            style={{ background: kademeStyle.bg, color: kademeStyle.text }}>
                            {klinikKademe}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Tarih */}
                      <td className="py-2.5 px-3 text-sm text-muted-foreground">{tarih}</td>

                      {/* Dosyalar — ham Excel + sonuç raporu */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ham Excel (Supabase) */}
                          {row.onlineId && (
                            <a href={`/api/test-excel?id=${row.onlineId}`} download
                              title="Ham veri (Excel)"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-colors">
                              <Download className="w-3 h-3" /> Excel
                            </a>
                          )}
                          {/* Sonuç raporu (local PDF) */}
                          {row.klinik?.pdfUrl && (
                            <a href={`/api/pdf/${row.klinik.pdfUrl.replace("data/pdf/", "")}`} target="_blank"
                              title="Klinik sonuç raporu"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-medium transition-colors">
                              <FileText className="w-3 h-3" /> Rapor
                            </a>
                          )}
                          {!row.onlineId && !row.klinik?.pdfUrl && (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
