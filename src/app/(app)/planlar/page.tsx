"use client"

import { useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useCollection } from "@/hooks/use-data"
import { formatDate } from "@/lib/triyaj"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Link from "next/link"
import type { Danisan } from "@/types"

const DURUM_RENK: Record<string, { text: string; bg: string }> = {
  "Aktif": { text: "#16A34A", bg: "#F0FDF4" },
  "Revize Edildi": { text: "#CA8A04", bg: "#FEFCE8" },
  "Tamamlandı": { text: "#78716C", bg: "#F5F0EB" },
}

export default function PlanlarPage() {
  const { data: planlar, isLoading } = useCollection("seansPlanlari")
  const { data: danisanlar } = useCollection("danisanlar")
  const [tab, setTab] = useState("all")

  const danisanMap = useMemo(() => {
    const m = new Map<string, Danisan>()
    danisanlar?.forEach(d => m.set(d.id, d))
    return m
  }, [danisanlar])

  const filtered = useMemo(() => {
    if (!planlar) return []
    if (tab === "all") return planlar
    return planlar.filter(p => p.planDurumu === tab)
  }, [planlar, tab])

  if (isLoading) return <div className="h-64 bg-muted rounded-xl animate-pulse" />

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Seans Planları" }]} />
      <h1 className="text-2xl font-bold">Seans Planları</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Tümü ({planlar?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="Aktif">Aktif</TabsTrigger>
          <TabsTrigger value="Revize Edildi">Revize</TabsTrigger>
          <TabsTrigger value="Tamamlandı">Tamamlandı</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Bu kategoride seans planı bulunmuyor.</p>
          ) : (
            <Accordion defaultValue={[]}>
              {filtered.map(p => {
                const d = danisanMap.get(p.danisanId)
                const durumStyle = DURUM_RENK[p.planDurumu] ?? { text: "#78716C", bg: "#F5F0EB" }
                return (
                  <AccordionItem key={p.id} value={p.id}>
                    <AccordionTrigger className="text-sm hover:no-underline py-3">
                      <div className="flex items-center gap-4 text-left w-full pr-4">
                        {d && (
                          <Link href={`/danisanlar/${d.id}`}
                            onClick={e => e.stopPropagation()}
                            className="font-medium hover:text-primary transition-colors">
                            {d.adSoyad}
                          </Link>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded bg-muted">{p.kaynak}</span>
                        <span className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{ background: durumStyle.bg, color: durumStyle.text }}>
                          {p.planDurumu}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">{formatDate(p.olusturmaTarihi)}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="prose-clinical text-sm pt-2 pb-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.planIcerigi}</ReactMarkdown>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
