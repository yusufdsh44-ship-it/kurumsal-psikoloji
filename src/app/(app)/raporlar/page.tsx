"use client"

import { useMemo } from "react"
import { useCollection } from "@/hooks/use-data"
import { slugify, formatDate } from "@/lib/triyaj"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function RaporlarPage() {
  const { data: mudurlukler, isLoading } = useCollection("mudurlukler")
  const { data: danisanlar } = useCollection("danisanlar")

  // gorusulenPersonel'i danışan verisinden dinamik hesapla
  const gorusulenMap = useMemo(() => {
    const map = new Map<string, number>()
    if (!danisanlar) return map
    for (const d of danisanlar) {
      if (d.gorusmeYapildi) {
        map.set(d.mudurlukId, (map.get(d.mudurlukId) ?? 0) + 1)
      }
    }
    return map
  }, [danisanlar])

  const raporlar = useMemo(() => {
    if (!mudurlukler) return []
    return mudurlukler.map(m => ({
      ...m,
      slug: slugify(m.mudurlukAdi),
      hasRapor: m.kurumselKlinikRapor !== null || m.sonRaporTarihi !== null,
      gorusulenDynamic: gorusulenMap.get(m.id) ?? 0,
    })).sort((a, b) => {
      if (a.hasRapor && !b.hasRapor) return -1
      if (!a.hasRapor && b.hasRapor) return 1
      return a.mudurlukAdi.localeCompare(b.mudurlukAdi, "tr")
    })
  }, [mudurlukler, gorusulenMap])

  if (isLoading) return <div className="h-64 bg-muted rounded-xl animate-pulse" />

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Raporlar" }]} />
      <h1 className="text-2xl font-bold">Kurumsal Klinik Raporlar</h1>
      <p className="text-sm text-muted-foreground">
        Claude Cowork ile üretilen müdürlük bazlı kurumsal klinik değerlendirme raporları.
        Raporlar <code className="text-xs bg-muted px-1.5 py-0.5 rounded">data/raporlar/</code> klasöründe saklanır.
      </p>

      <Card>
        <CardContent className="pt-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Müdürlük</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">Personel</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">Görüşülen</th>
                <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">Rapor Durumu</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Son Rapor</th>
                <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {raporlar.map(m => (
                <tr key={m.id} className="border-b border-border/40 hover:bg-muted/50 transition-colors">
                  <td className="py-2.5 px-3">
                    <Link href={`/mudurlukler/${m.id}`} className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {m.mudurlukAdi}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-center text-sm text-muted-foreground">{m.personelSayisi}</td>
                  <td className="py-2.5 px-3 text-center text-sm text-muted-foreground">{m.gorusulenDynamic}</td>
                  <td className="py-2.5 px-3 text-center">
                    {m.hasRapor ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">Mevcut</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Henüz Yok</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-muted-foreground">{formatDate(m.sonRaporTarihi)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <Link href={`/mudurlukler/${m.id}`} className="text-xs text-primary hover:underline flex items-center gap-1 justify-end">
                      Görüntüle <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
