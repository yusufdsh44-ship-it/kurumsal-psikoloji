"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useCollection } from "@/hooks/use-data"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Map as MapIcon, Table2, Info } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { KSE_NORM, BELEDIYE_ORTALAMALARI } from "@/lib/constants"
import { computeDepartmentRisk, type DeptRiskResult } from "@/lib/triyaj"
import {
  Treemap, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts"
import type { Mudurluk, RiskSeviyesi, Danisan, TestSonucu, GorusmeNotu } from "@/types"

const RISK_COLORS: Record<RiskSeviyesi, { text: string; bg: string; bar: string; fill: string }> = {
  "Yüksek": { text: "#DC2626", bg: "#FEF2F2", bar: "#DC2626", fill: "#FCA5A5" },
  "Orta": { text: "#CA8A04", bg: "#FEFCE8", bar: "#CA8A04", fill: "#FDE68A" },
  "Düşük": { text: "#16A34A", bg: "#F0FDF4", bar: "#16A34A", fill: "#BBF7D0" },
}

const RADAR_COLORS = ["#B45309", "#2563EB", "#7C3AED", "#059669"]

function getDengeColor(denge: number | null): string {
  if (denge === null) return "#78716C"
  if (denge < 0) return "#DC2626"
  if (denge <= 10) return "#CA8A04"
  return "#16A34A"
}

interface MudurlukStats {
  gorusulen: number
  avgGsi: number | null
  avgBfi: number | null
  baskinTema: string
  kseDagilim: Record<string, number>
  kritikSayisi: number
}

export default function MudurluklerPage() {
  const { data: mudurlukler, isLoading: mLoad } = useCollection("mudurlukler")
  const { data: danisanlar } = useCollection("danisanlar")
  const { data: testler } = useCollection("testSonuclari")
  const { data: notlar } = useCollection("gorusmeNotlari")
  const router = useRouter()
  const [radarSelected, setRadarSelected] = useState<string[]>([])

  // Compute per-müdürlük clinical stats
  const statsMap = useMemo(() => {
    const map = new Map<string, MudurlukStats>()
    if (!mudurlukler || !danisanlar) return map

    for (const m of mudurlukler) {
      const mDanisanlar = danisanlar.filter(d => d.mudurlukId === m.id)
      const gorusulen = mDanisanlar.filter(d => d.gorusmeYapildi).length

      const mDanisanIds = new Set(mDanisanlar.map(d => d.id))
      const mKseTests = (testler ?? []).filter(t => mDanisanIds.has(t.danisanId) && t.gsi !== null)
      const avgGsi = mKseTests.length > 0
        ? mKseTests.reduce((sum, t) => sum + (t.gsi ?? 0), 0) / mKseTests.length
        : null

      const mBfiTests = (testler ?? []).filter(t => mDanisanIds.has(t.danisanId) && t.olumsuzDuygu !== null)
      const avgBfi = mBfiTests.length > 0
        ? mBfiTests.reduce((sum, t) => sum + (t.olumsuzDuygu ?? 0), 0) / mBfiTests.length
        : null

      const mNotlar = (notlar ?? []).filter(n => mDanisanIds.has(n.danisanId))
      const temaCounts = new Map<string, number>()
      for (const n of mNotlar) {
        for (const t of n.kurumsalTema) {
          temaCounts.set(t, (temaCounts.get(t) ?? 0) + 1)
        }
      }
      let baskinTema = ""
      if (temaCounts.size > 0) {
        const sorted = [...temaCounts.entries()].sort((a, b) => b[1] - a[1])
        baskinTema = sorted.slice(0, 2).map(([t]) => t).join(", ")
      }

      const kseDagilim: Record<string, number> = {}
      for (const d of mDanisanlar) {
        if (d.kseKademe != null) {
          const k = String(d.kseKademe)
          kseDagilim[k] = (kseDagilim[k] ?? 0) + 1
        }
      }

      const kritikSayisi = mDanisanlar.filter(d => d.triyajKademesi === 1 || d.triyajKademesi === 2).length
      map.set(m.id, { gorusulen, avgGsi, avgBfi, baskinTema, kseDagilim, kritikSayisi })
    }
    return map
  }, [mudurlukler, danisanlar, testler, notlar])

  // Compute composite risk per department
  const riskMap = useMemo(() => {
    const map = new Map<string, DeptRiskResult>()
    if (!mudurlukler) return map
    for (const m of mudurlukler) {
      const stats = statsMap.get(m.id)
      map.set(m.id, computeDepartmentRisk({
        denge: m.denge,
        ruhSagligiRiski: m.ruhSagligiRiski,
        genelMemnuniyet: m.genelMemnuniyet,
        avgGsi: stats?.avgGsi ?? null,
        kritikVakaSayisi: stats?.kritikSayisi ?? 0,
        toplamPersonel: m.personelSayisi,
      }))
    }
    return map
  }, [mudurlukler, statsMap])

  const sorted = useMemo(() => {
    if (!mudurlukler) return []
    return [...mudurlukler].sort((a, b) => (riskMap.get(b.id)?.score ?? 0) - (riskMap.get(a.id)?.score ?? 0))
  }, [mudurlukler, riskMap])

  // Treemap data
  const treemapData = useMemo(() => {
    if (!mudurlukler) return []
    return mudurlukler.map(m => {
      const risk = m.riskSeviyesi ?? "Düşük"
      return {
        name: m.mudurlukAdi.replace(" Müdürlüğü", "").replace(" Başkanlığı", ""),
        size: m.personelSayisi,
        risk,
        fill: RISK_COLORS[risk].fill,
        stroke: RISK_COLORS[risk].bar,
        id: m.id,
        denge: m.denge,
      }
    })
  }, [mudurlukler])

  // Kurumsal tema aggregation across departments
  const temaChartData = useMemo(() => {
    if (!mudurlukler || !danisanlar || !notlar) return []
    const temaMap = new Map<string, number>()

    for (const n of notlar) {
      for (const t of n.kurumsalTema) {
        temaMap.set(t, (temaMap.get(t) ?? 0) + 1)
      }
    }

    return [...temaMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tema, count]) => ({ tema, sayi: count }))
  }, [mudurlukler, danisanlar, notlar])

  // Radar chart data for selected departments
  const radarData = useMemo(() => {
    if (!mudurlukler) return []
    const metrics = [
      { key: "genelMemnuniyet", label: "Memnuniyet", avg: BELEDIYE_ORTALAMALARI.genelMemnuniyet },
      { key: "isStresi", label: "Stres", avg: BELEDIYE_ORTALAMALARI.isStresi },
      { key: "kurumDestegi", label: "Destek", avg: BELEDIYE_ORTALAMALARI.kurumDestegi },
      { key: "ruhSagligiRiski", label: "Ruh Sağlığı Riski", avg: BELEDIYE_ORTALAMALARI.ruhSagligiRiski },
    ] as const

    return metrics.map(({ key, label, avg }) => {
      const row: Record<string, string | number> = { metric: label, "Belediye Ort.": avg }
      for (const mId of radarSelected) {
        const m = mudurlukler.find(x => x.id === mId)
        if (m) {
          const shortName = m.mudurlukAdi.replace(" Müdürlüğü", "").replace(" Başkanlığı", "")
          row[shortName] = m[key] ?? 0
        }
      }
      return row
    })
  }, [mudurlukler, radarSelected])

  const radarKeys = useMemo(() => {
    if (!mudurlukler) return []
    return radarSelected.map(mId => {
      const m = mudurlukler.find(x => x.id === mId)
      return m ? m.mudurlukAdi.replace(" Müdürlüğü", "").replace(" Başkanlığı", "") : ""
    }).filter(Boolean)
  }, [mudurlukler, radarSelected])

  if (mLoad) return <MudurluklerSkeleton />

  return (
    <div>
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Müdürlükler" }]} />

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Müdürlükler</h1>
          <p className="text-sm text-muted-foreground">{sorted.length} müdürlük · {mudurlukler?.reduce((s, m) => s + m.personelSayisi, 0)} personel</p>
        </div>
      </div>

      <Tabs defaultValue="tablo">
        <TabsList>
          <TabsTrigger value="tablo" className="gap-1.5"><Table2 className="w-3.5 h-3.5" />Tablo</TabsTrigger>
          <TabsTrigger value="harita" className="gap-1.5"><MapIcon className="w-3.5 h-3.5" />Risk Haritası</TabsTrigger>
        </TabsList>

        {/* === TABLO TAB === */}
        <TabsContent value="tablo">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Risk Sıralaması</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    {/* Grup başlıkları */}
                    <tr>
                      <th className="px-2" />
                      <th colSpan={2} className="px-1.5" />
                      <th colSpan={3} className="text-center pb-0.5">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-semibold text-amber-700 tracking-wider uppercase">Müdürlük Anketi</span>
                          <div className="w-full h-0.5 bg-amber-400/60 rounded mt-0.5" />
                        </div>
                      </th>
                      <th colSpan={4} className="text-center pb-0.5">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-semibold text-purple-700 tracking-wider uppercase">Klinik Veri</span>
                          <div className="w-full h-0.5 bg-purple-400/60 rounded mt-0.5" />
                        </div>
                      </th>
                      <th className="px-1.5" />
                    </tr>
                    {/* Sütun başlıkları */}
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Müdürlük</th>
                      <th className="text-center py-2 px-1.5 text-xs font-medium text-muted-foreground">Personel Sayısı</th>
                      <th className="text-center py-2 px-1.5 text-xs font-medium text-muted-foreground" title="Görüşülen / Toplam personel">Görüşülen</th>
                      <th className="text-center py-2 px-1.5 text-xs font-medium text-amber-600/70">Denge</th>
                      <th className="text-center py-2 px-1.5 text-xs font-medium text-amber-600/70">Ruh Sağlığı</th>
                      <th className="text-center py-2 px-1.5 text-xs font-medium text-amber-600/70">Memnuniyet</th>
                      <th className="text-center py-2 px-1.5 text-xs font-medium text-purple-600/70" title="Ortalama GSI skoru (Belediye ortalaması: 0.87)">GSI Ort.</th>
                      <th className="text-center py-2 px-1.5 text-xs font-medium text-purple-600/70" title="KSE kademe dağılımı">KSE Dağılım</th>
                      <th className="text-center py-2 px-1.5 text-xs font-medium text-purple-600/70" title="Ortalama BFI Olumsuz Duygu skoru">BFI Ort.</th>
                      <th className="text-left py-2 px-1.5 text-xs font-medium text-purple-600/70">Baskın Tema</th>
                      <th className="text-left py-2 px-1.5 text-xs font-medium text-muted-foreground min-w-[120px]">Risk Seviyesi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((m) => {
                      const stats = statsMap.get(m.id)
                      return (
                        <MudurlukRow key={m.id} mudurluk={m} stats={stats} risk={riskMap.get(m.id)} onClick={() => router.push(`/mudurlukler/${m.id}`)} />
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === RİSK HARİTASI TAB === */}
        <TabsContent value="harita" className="space-y-4">
          {/* Treemap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Müdürlük Risk Haritası</CardTitle>
              <p className="text-xs text-muted-foreground">Kutu boyutu = personel sayısı, renk = risk seviyesi. Tıklayarak detaya gidin.</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  nameKey="name"
                  stroke="#fff"
                  content={(props: Record<string, unknown>) => {
                    const { x, y, width, height, name, fill, stroke, risk, size } = props as {
                      x: number; y: number; width: number; height: number
                      name?: string; fill?: string; stroke?: string; risk?: string; size?: number
                    }
                    if (!width || !height || width < 2 || height < 2) return <g />
                    const showLabel = width > 60 && height > 30
                    return (
                      <g>
                        <rect
                          x={x} y={y} width={width} height={height}
                          rx={4}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={1.5}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            const itemId = (props as { id?: string }).id
                            if (itemId) router.push(`/mudurlukler/${itemId}`)
                          }}
                        />
                        {showLabel && (
                          <>
                            <text x={x + 6} y={y + 16} className="text-[10px] font-medium fill-stone-800">
                              {name}
                            </text>
                            <text x={x + 6} y={y + 28} className="text-[9px] fill-stone-600">
                              {size} kişi · {risk}
                            </text>
                          </>
                        )}
                      </g>
                    )
                  }}
                />
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 justify-center">
                {(["Yüksek", "Orta", "Düşük"] as RiskSeviyesi[]).map(r => (
                  <div key={r} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-3 h-3 rounded" style={{ background: RISK_COLORS[r].fill, border: `1.5px solid ${RISK_COLORS[r].bar}` }} />
                    {r}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tema Yogunlasma */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Kurumsal Tema Dağılımı</CardTitle>
                <p className="text-xs text-muted-foreground">Tüm görüşmelerde en sık geçen kurumsal temalar</p>
              </CardHeader>
              <CardContent>
                {temaChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Henüz kurumsal tema verisi yok.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={temaChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="tema" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(v) => [`${v} görüşme`, "Sıklık"]}
                      />
                      <Bar dataKey="sayi" fill="#B45309" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Radar Karsilastirma */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Müdürlük Karşılaştırma</CardTitle>
                <p className="text-xs text-muted-foreground">Belediye ortalamasına göre karşılaştırma (maks. 3 müdürlük seçin)</p>
              </CardHeader>
              <CardContent>
                {/* Mudurluk chip selector */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {mudurlukler?.slice().sort((a, b) => a.mudurlukAdi.localeCompare(b.mudurlukAdi)).map(m => {
                    const sel = radarSelected.includes(m.id)
                    const risk = m.riskSeviyesi ?? "Düşük"
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          if (sel) setRadarSelected(p => p.filter(x => x !== m.id))
                          else if (radarSelected.length < 3) setRadarSelected(p => [...p, m.id])
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
                          sel
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                        style={sel ? {} : { borderLeftColor: RISK_COLORS[risk].bar, borderLeftWidth: 3 }}
                      >
                        {m.mudurlukAdi.replace(" Müdürlüğü", "").replace(" Başkanlığı", "")}
                      </button>
                    )
                  })}
                </div>

                {radarSelected.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Karşılaştırmak için müdürlük seçin.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis tick={{ fontSize: 9 }} />
                      <Radar name="Belediye Ort." dataKey="Belediye Ort." stroke="#78716C" fill="#78716C" fillOpacity={0.1} strokeDasharray="4 4" />
                      {radarKeys.map((key, i) => (
                        <Radar key={key} name={key} dataKey={key} stroke={RADAR_COLORS[i]} fill={RADAR_COLORS[i]} fillOpacity={0.15} />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const KADEME_BAR_COLORS: Record<string, string> = {
  "1": "#DC2626", "2": "#EA580C", "3": "#CA8A04", "4": "#2563EB", "5": "#16A34A",
}

function MudurlukRow({ mudurluk: m, stats, risk, onClick }: { mudurluk: Mudurluk; stats?: MudurlukStats; risk?: DeptRiskResult; onClick: () => void }) {
  const dengeColor = getDengeColor(m.denge)
  const riskResult = risk ?? { score: 0, seviye: "Düşük" as const, bilesenler: [] }
  const riskStyle = RISK_COLORS[riskResult.seviye]

  const gsiDeviation = stats?.avgGsi != null ? stats.avgGsi - KSE_NORM.gsi.mean : null
  const gsiColor = gsiDeviation !== null ? (gsiDeviation > 0 ? "#DC2626" : "#16A34A") : "#78716C"
  const bfiColor = stats?.avgBfi != null ? (stats.avgBfi > 3 ? "#DC2626" : stats.avgBfi > 2.5 ? "#CA8A04" : "#16A34A") : "#78716C"

  const kseDagilim = stats?.kseDagilim ?? {}
  const kseTotal = Object.values(kseDagilim).reduce((s, n) => s + n, 0)

  return (
    <tr className="border-b border-border/40 hover:bg-muted/50 transition-colors cursor-pointer" onClick={onClick}>
      <td className="py-2 px-2">
        <div className="text-sm font-medium text-foreground">{m.mudurlukAdi}</div>
      </td>
      <td className="py-2 px-1.5 text-center text-xs text-muted-foreground">{m.personelSayisi}</td>
      <td className="py-2 px-1.5 text-center">
        <span className="text-xs text-muted-foreground">
          {stats?.gorusulen ?? 0}/{m.personelSayisi}
        </span>
      </td>
      <td className="py-2 px-1.5 text-center">
        <span className="text-xs font-bold font-mono" style={{ color: dengeColor }}>
          {m.denge !== null ? m.denge.toFixed(1) : "—"}
        </span>
      </td>
      <td className="py-2 px-1.5 text-center text-xs font-mono">
        {m.ruhSagligiRiski !== null ? `${m.ruhSagligiRiski.toFixed(1)}%` : "—"}
      </td>
      <td className="py-2 px-1.5 text-center text-xs font-mono">
        {m.genelMemnuniyet !== null ? `${m.genelMemnuniyet.toFixed(1)}%` : "—"}
      </td>
      <td className="py-2 px-1.5 text-center">
        {stats?.avgGsi != null ? (
          <span className="text-xs font-mono font-bold" style={{ color: gsiColor }}>
            {stats.avgGsi.toFixed(2)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="py-2 px-1.5">
        {kseTotal > 0 ? (
          <div className="flex items-center gap-px" title={Object.entries(kseDagilim).map(([k, v]) => `K${k}: ${v}`).join(", ")}>
            <div className="flex h-2 w-16 rounded-sm overflow-hidden">
              {["1","2","3","4","5"].map(k => {
                const count = kseDagilim[k] ?? 0
                if (count === 0) return null
                return <div key={k} style={{ width: `${(count / kseTotal) * 100}%`, background: KADEME_BAR_COLORS[k] }} />
              })}
            </div>
            <span className="text-[9px] text-muted-foreground ml-1">{kseTotal}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="py-2 px-1.5 text-center">
        {stats?.avgBfi != null ? (
          <span className="text-xs font-mono font-bold" style={{ color: bfiColor }}>
            {stats.avgBfi.toFixed(2)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="py-2 px-1.5">
        {stats?.baskinTema ? (
          <span className="text-[11px] text-muted-foreground leading-tight">{stats.baskinTema}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground/40">—</span>
        )}
      </td>
      {/* Bilesik Risk */}
      <td className="py-2 px-1.5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, riskResult.score)}%`, background: riskStyle.bar }} />
          </div>
          <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded" style={{ background: riskStyle.bg, color: riskStyle.text }}>
            {riskResult.seviye}
          </span>
          <Popover>
            <PopoverTrigger className="p-0.5 rounded hover:bg-muted transition-colors shrink-0" title="Risk hesaplama detayı">
              <Info className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" side="left" align="start">
              <div className="px-3 py-2 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Bileşik Risk Skoru</span>
                  <span className="text-sm font-bold font-mono" style={{ color: riskStyle.text }}>
                    {riskResult.score.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="px-3 py-2 space-y-1.5">
                {riskResult.bilesenler.map(b => (
                  <div key={b.ad} className="flex items-center gap-2 text-[11px]">
                    <div className="flex-1 min-w-0">
                      <span className={b.mevcut ? "text-foreground" : "text-muted-foreground/40 line-through"}>
                        {b.ad}
                      </span>
                    </div>
                    {b.mevcut ? (
                      <>
                        <span className="font-mono text-muted-foreground w-8 text-right">{b.skor.toFixed(0)}</span>
                        <span className="text-muted-foreground/50">x</span>
                        <span className="font-mono text-muted-foreground w-6 text-right">{(b.agirlik * 100).toFixed(0)}%</span>
                        <span className="font-mono font-bold w-8 text-right" style={{ color: b.katki > 15 ? "#DC2626" : b.katki > 8 ? "#CA8A04" : "#16A34A" }}>
                          {b.katki.toFixed(1)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40 italic">veri yok</span>
                    )}
                  </div>
                ))}
                <div className="pt-1.5 mt-1 border-t border-border/50 text-[10px] text-muted-foreground/60 leading-relaxed">
                  Skor 0-100 arası. Her bileşen normalize edilip ağırlıkla çarpılır. Veri olmayan bileşenler çıkarılır, kalan ağırlıklar oranlanır.
                  <br />≥60 Yüksek · 35-59 Orta · &lt;35 Düşük
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </td>
    </tr>
  )
}

function MudurluklerSkeleton() {
  return (
    <div>
      <div className="h-4 w-48 bg-muted rounded mb-4 animate-pulse" />
      <div className="h-8 w-56 bg-muted rounded mb-6 animate-pulse" />
      <div className="h-[500px] bg-muted rounded-xl animate-pulse" />
    </div>
  )
}
