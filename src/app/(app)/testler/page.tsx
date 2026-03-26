"use client"

import { useMemo, useState, useEffect } from "react"
import { useCollection } from "@/hooks/use-data"
import { getKademeStyle, getBfiKademeStyle, formatDate } from "@/lib/triyaj"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Download, Globe, User } from "lucide-react"
import type { TestSonucu, Danisan } from "@/types"

interface OnlineTest {
  id: string
  ad_soyad: string
  mudurluk: string
  test_turu: string
  tarih: string
}

export default function TestlerPage() {
  const { data: testler, isLoading } = useCollection("testSonuclari")
  const { data: danisanlar } = useCollection("danisanlar")
  const [tab, setTab] = useState("online")
  const [onlineTestler, setOnlineTestler] = useState<OnlineTest[]>([])
  const [loadingOnline, setLoadingOnline] = useState(true)

  // Online testleri Supabase'den çek
  useEffect(() => {
    fetch("/api/online-testler")
      .then(r => r.json())
      .then(data => setOnlineTestler(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingOnline(false))
  }, [])

  const danisanMap = useMemo(() => {
    const m = new Map<string, Danisan>()
    danisanlar?.forEach(d => m.set(d.id, d))
    return m
  }, [danisanlar])

  // Online test → danışan eşleştirme (ad soyad ile)
  const findDanisan = (adSoyad: string): Danisan | null => {
    if (!danisanlar) return null
    return danisanlar.find(d => d.adSoyad.toLowerCase() === adSoyad.toLowerCase()) ?? null
  }

  const filtered = useMemo(() => {
    if (!testler) return []
    switch (tab) {
      case "kse": return testler.filter(t => t.testTuru === "KSE-53")
      case "bfi": return testler.filter(t => t.testTuru === "BFI-2")
      case "birlesik": return testler.filter(t => t.testTuru === "Birleşik")
      case "gsi": return testler.filter(t => t.gsi !== null && t.gsi > 1.0)
      default: return testler
    }
  }, [testler, tab])

  const onlineFiltered = useMemo(() => {
    switch (tab) {
      case "online-kse": return onlineTestler.filter(t => t.test_turu === "KSE-53")
      case "online-bfi": return onlineTestler.filter(t => t.test_turu === "BFI-2")
      default: return onlineTestler
    }
  }, [onlineTestler, tab])

  if (isLoading) return <div className="h-64 bg-muted rounded-xl animate-pulse" />

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Test Sonuçları" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Test Sonuçları</h1>
        <a href="/api/test-excel" download
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors shadow-sm">
          <Download className="w-4 h-4" />
          Tümünü İndir (Excel)
        </a>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="online">
            <Globe className="w-3.5 h-3.5 mr-1" />
            Online ({onlineTestler.length})
          </TabsTrigger>
          <TabsTrigger value="online-kse">KSE-53</TabsTrigger>
          <TabsTrigger value="online-bfi">BFI-2</TabsTrigger>
          <TabsTrigger value="all">Dahili ({testler?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* Online Testler */}
        <TabsContent value="online">
          <OnlineTable testler={onlineFiltered} loading={loadingOnline} findDanisan={findDanisan} />
        </TabsContent>
        <TabsContent value="online-kse">
          <OnlineTable testler={onlineFiltered} loading={loadingOnline} findDanisan={findDanisan} />
        </TabsContent>
        <TabsContent value="online-bfi">
          <OnlineTable testler={onlineFiltered} loading={loadingOnline} findDanisan={findDanisan} />
        </TabsContent>

        {/* Dahili Testler (mevcut) */}
        <TabsContent value="all">
          <Card>
            <CardContent className="pt-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Danışan</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">Tür</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">Kademe</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">GSI</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const d = danisanMap.get(t.danisanId)
                    const isKse = t.testTuru !== "BFI-2"
                    const kademeStyle = isKse && t.kademe ? getKademeStyle(Number(t.kademe)) : getBfiKademeStyle(t.kademe)
                    return (
                      <tr key={t.id} className="border-b border-border/40 hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3">
                          {d ? (
                            <Link href={`/danisanlar/${d.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                              {d.adSoyad}
                            </Link>
                          ) : <span className="text-sm text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">{t.testTuru}</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {t.kademe && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                              style={{ background: kademeStyle.bg, color: kademeStyle.text }}>
                              {t.kademe}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center text-sm font-mono">{t.gsi?.toFixed(2) ?? "—"}</td>
                        <td className="py-2 px-3 text-sm text-muted-foreground">{formatDate(t.uygulamaTarihi)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">Bu kategoride test sonucu bulunmuyor.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OnlineTable({ testler, loading, findDanisan }: {
  testler: OnlineTest[]; loading: boolean; findDanisan: (ad: string) => Danisan | null
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Kişi</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Müdürlük</th>
              <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">Test</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Tarih</th>
              <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">İndir</th>
            </tr>
          </thead>
          <tbody>
            {testler.map(t => {
              const match = findDanisan(t.ad_soyad)
              const tarih = t.tarih ? new Date(t.tarih).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
              return (
                <tr key={t.id} className="border-b border-border/40 hover:bg-muted/50 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      {match ? (
                        <Link href={`/danisanlar/${match.id}`} className="flex items-center gap-2.5 group">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ background: getKademeStyle(match.triyajKademesi).text }}>
                            {match.adSoyad.split(" ").map(p => p[0]).join("").slice(0, 2)}
                          </div>
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">{t.ad_soyad}</span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium">{t.ad_soyad}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-sm text-muted-foreground truncate max-w-[200px]">{t.mudurluk}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.test_turu === "KSE-53" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                    }`}>{t.test_turu}</span>
                  </td>
                  <td className="py-2.5 px-3 text-sm text-muted-foreground">{tarih}</td>
                  <td className="py-2.5 px-3 text-center">
                    <a href={`/api/test-excel?id=${t.id}`} download
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-colors">
                      <Download className="w-3 h-3" /> Excel
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {testler.length === 0 && (
          <div className="text-center py-8">
            <Globe className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-muted-foreground">Henüz portal üzerinden doldurulan test bulunmuyor.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
