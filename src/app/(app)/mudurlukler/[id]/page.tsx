"use client"

import { use, useState, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useCollection, useReport, useUpdateReport } from "@/hooks/use-data"
import { getKademeStyle, getBfiKademeStyle, getInitials, formatDate, slugify } from "@/lib/triyaj"
import { BELEDIYE_ORTALAMALARI, METRIK_INFO, KSE_NORM } from "@/lib/constants"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  TrendingUp, TrendingDown, Eye, Edit3, Save, Users, FileText,
  Maximize2, Minimize2, BarChart3, ClipboardCheck, Building2,
} from "lucide-react"
import Link from "next/link"
import type { Mudurluk } from "@/types"

const RISK_RENK: Record<string, string> = {
  "Yüksek": "#DC2626",
  "Orta": "#CA8A04",
  "Düşük": "#16A34A",
}

export default function MudurlukDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: mudurlukler } = useCollection("mudurlukler")
  const { data: danisanlar } = useCollection("danisanlar")
  const { data: testler } = useCollection("testSonuclari")
  const { data: notlar } = useCollection("gorusmeNotlari")
  const mudurluk = mudurlukler?.find(m => m.id === id)
  const slug = mudurluk ? slugify(mudurluk.mudurlukAdi) : ""
  const { data: raporContent } = useReport(slug || undefined)
  const updateReport = useUpdateReport()
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState("")
  const [anketExpanded, setAnketExpanded] = useState(false)

  const mDanisanlar = useMemo(() =>
    danisanlar?.filter(d => d.mudurlukId === id) ?? [], [danisanlar, id])

  const mDanisanIds = useMemo(() => new Set(mDanisanlar.map(d => d.id)), [mDanisanlar])

  const kademeDist = useMemo(() => {
    const dist = new Map<number, number>([[1,0],[2,0],[3,0],[4,0],[5,0]])
    let noKademe = 0
    for (const d of mDanisanlar) {
      if (d.triyajKademesi && dist.has(d.triyajKademesi)) dist.set(d.triyajKademesi, dist.get(d.triyajKademesi)! + 1)
      else noKademe++
    }
    return { dist, none: noKademe }
  }, [mDanisanlar])

  const testStats = useMemo(() => {
    const mTestler = (testler ?? []).filter(t => mDanisanIds.has(t.danisanId))
    const kseTests = mTestler.filter(t => t.gsi !== null)
    const bfiTests = mTestler.filter(t => t.olumsuzDuygu !== null)
    const avgGsi = kseTests.length > 0 ? kseTests.reduce((s, t) => s + (t.gsi ?? 0), 0) / kseTests.length : null
    const avgOlumsuz = bfiTests.length > 0 ? bfiTests.reduce((s, t) => s + (t.olumsuzDuygu ?? 0), 0) / bfiTests.length : null
    const testYapilan = new Set(mTestler.map(t => t.danisanId)).size
    return { avgGsi, avgOlumsuz, testYapilan, total: kseTests.length + bfiTests.length }
  }, [testler, mDanisanIds])

  const temaDist = useMemo(() => {
    const mNotlar = (notlar ?? []).filter(n => mDanisanIds.has(n.danisanId))
    const counts = new Map<string, number>()
    for (const n of mNotlar) {
      for (const t of n.kurumsalTema) counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [notlar, mDanisanIds])

  const durumDist = useMemo(() => {
    const dist: Record<string, number> = {}
    for (const d of mDanisanlar) {
      dist[d.genelDurum] = (dist[d.genelDurum] ?? 0) + 1
    }
    return dist
  }, [mDanisanlar])

  const gorusulen = mDanisanlar.filter(d => d.gorusmeYapildi).length

  if (!mudurluk) return <div className="h-64 bg-muted rounded-xl animate-pulse" />

  const riskRenk = RISK_RENK[mudurluk.riskSeviyesi ?? "Düşük"] ?? "#16A34A"

  const handleSaveReport = () => {
    updateReport.mutate({ slug, content: draft }, {
      onSuccess: () => setEditMode(false),
    })
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={[
        { label: "Dashboard", href: "/" },
        { label: "Müdürlükler", href: "/mudurlukler" },
        { label: mudurluk.mudurlukAdi },
      ]} />

      {/* Header Card */}
      <div className="rounded-xl border border-[#DDD5CA] overflow-hidden shadow-sm shadow-[#DDD5CA]/50">
        <div className="h-1" style={{ background: riskRenk }} />
        <div className="px-4 py-3 space-y-1.5 bg-gradient-to-b from-[#FEFCF7] to-[#FBF8F2]">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">{mudurluk.mudurlukAdi}</h1>
            {mudurluk.riskSeviyesi && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: riskRenk + "18", color: riskRenk }}>
                {mudurluk.riskSeviyesi} Risk
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{mudurluk.personelSayisi} personel</span>
            <span>·</span>
            <span>Test: {testStats.testYapilan}/{mDanisanlar.length}</span>
            <span>·</span>
            <span>Görüşülen: {gorusulen}/{mDanisanlar.length}</span>
            {mudurluk.katilimOrani !== null && <>
              <span>·</span>
              <span>Anket katılım: %{mudurluk.katilimOrani.toFixed(0)}</span>
            </>}
          </div>

          {/* Anket Metrikleri */}
          {mudurluk.genelMemnuniyet !== null && (
            <>
              <div className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest pt-1.5">Anket Verileri</div>
              <div className="flex gap-2">
                {(["genelMemnuniyet", "isStresi", "kurumDestegi", "denge", "ruhSagligiRiski"] as const).map(key => {
                  const val = mudurluk[key]
                  const avg = BELEDIYE_ORTALAMALARI[key]
                  const info = METRIK_INFO[key]
                  if (val === null) return <div key={key} className="flex-1" />
                  const diff = val - avg
                  const isGood = info.yuksekIyi ? diff >= 0 : diff <= 0
                  return (
                    <div key={key} className="flex-1 text-center rounded-lg border border-[#E4DDD4] bg-white/60 py-1.5 px-1">
                      <div className="text-[9px] text-muted-foreground">{info.label}</div>
                      <div className="text-base font-bold" style={{ color: isGood ? "#16A34A" : "#DC2626" }}>
                        {val.toFixed(1)}{info.unit}
                      </div>
                      <div className="flex items-center justify-center gap-0.5 text-[9px]">
                        {isGood ? <TrendingUp className="w-2 h-2 text-green-600" /> : <TrendingDown className="w-2 h-2 text-red-600" />}
                        <span className={isGood ? "text-green-600" : "text-red-600"}>
                          {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Klinik Metrikler */}
          {mDanisanlar.length > 0 && (() => {
            const k1 = kademeDist.dist.get(1) ?? 0
            const k2 = kademeDist.dist.get(2) ?? 0
            const acilYuksek = k1 + k2
            const testOran = Math.round((testStats.testYapilan / mDanisanlar.length) * 100)
            const gorusmeOran = Math.round((gorusulen / mDanisanlar.length) * 100)
            return (
              <>
                <div className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest pt-1">Klinik Veriler</div>
                <div className="flex gap-2">
                  {/* Acil + Yüksek */}
                  <div className="flex-1 text-center rounded-lg border py-1.5 px-1"
                    style={{
                      borderColor: acilYuksek > 0 ? "#FCA5A5" : "#E4DDD4",
                      background: acilYuksek > 0 ? "#FEF2F2" : "rgba(255,255,255,0.6)",
                    }}>
                    <div className="text-[9px] text-muted-foreground">Acil + Yüksek</div>
                    <div className="text-base font-bold" style={{ color: acilYuksek > 0 ? "#DC2626" : "#16A34A" }}>
                      {acilYuksek}
                    </div>
                    <div className="text-[9px] text-muted-foreground">K1: {k1} · K2: {k2}</div>
                  </div>
                  {/* GSI Ortalaması */}
                  <div className="flex-1 text-center rounded-lg border border-[#E4DDD4] bg-white/60 py-1.5 px-1">
                    <div className="text-[9px] text-muted-foreground">GSI Ort.</div>
                    <div className="text-base font-bold font-mono" style={{ color: testStats.avgGsi !== null && testStats.avgGsi > KSE_NORM.gsi.mean ? "#DC2626" : "#16A34A" }}>
                      {testStats.avgGsi !== null ? testStats.avgGsi.toFixed(2) : "—"}
                    </div>
                    <div className="text-[9px] text-muted-foreground">norm {KSE_NORM.gsi.mean}</div>
                  </div>
                  {/* Test Oranı */}
                  <div className="flex-1 text-center rounded-lg border border-[#E4DDD4] bg-white/60 py-1.5 px-1">
                    <div className="text-[9px] text-muted-foreground">Test</div>
                    <div className="text-base font-bold" style={{ color: testOran >= 50 ? "#16A34A" : "#CA8A04" }}>
                      %{testOran}
                    </div>
                    <div className="text-[9px] text-muted-foreground">{testStats.testYapilan}/{mDanisanlar.length}</div>
                  </div>
                  {/* Görüşme Oranı */}
                  <div className="flex-1 text-center rounded-lg border border-[#E4DDD4] bg-white/60 py-1.5 px-1">
                    <div className="text-[9px] text-muted-foreground">Görüşme</div>
                    <div className="text-base font-bold" style={{ color: gorusmeOran >= 50 ? "#16A34A" : "#CA8A04" }}>
                      %{gorusmeOran}
                    </div>
                    <div className="text-[9px] text-muted-foreground">{gorusulen}/{mDanisanlar.length}</div>
                  </div>
                  {/* Baskın Tema */}
                  <div className="flex-1 text-center rounded-lg border border-[#E4DDD4] bg-white/60 py-1.5 px-1">
                    <div className="text-[9px] text-muted-foreground">Baskın Tema</div>
                    {temaDist.length > 0 ? (
                      <>
                        <div className="text-xs font-semibold text-red-600 truncate px-0.5">{temaDist[0][0]}</div>
                        <div className="text-[9px] text-muted-foreground">{temaDist[0][1]} kayıt</div>
                      </>
                    ) : (
                      <div className="text-base text-muted-foreground">—</div>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Kurumsal Dosya */}
      <div className="dossier">
        <div className="dossier-header">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 className="w-3.5 h-3.5 text-[#8B7E6E] shrink-0" />
            <span className="text-[10px] font-semibold text-[#8B7E6E] uppercase tracking-[0.12em]">
              Müdürlüğün Klinik Dosyası
            </span>
          </div>
          <span className="text-[10px] text-[#A89E90] font-mono shrink-0">
            {mDanisanlar.length} kayıt
          </span>
        </div>

        <Accordion>
          {/* Klinik Özet (Sayısal) */}
          <div className="dossier-row">
            <AccordionItem value="klinik-ozet">
              <AccordionTrigger className="text-sm hover:no-underline px-4 hover:bg-white/50 transition-colors">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-1 h-5 rounded-full bg-purple-400" />
                  <ClipboardCheck className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">Klinik Özet (Sayısal)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Kademe dağılımı */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Triyaj Kademe Dağılımı</div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(k => {
                        const count = kademeDist.dist.get(k) ?? 0
                        const style = getKademeStyle(k)
                        const pct = mDanisanlar.length > 0 ? Math.round((count / mDanisanlar.length) * 100) : 0
                        return (
                          <div key={k} className="flex-1 text-center rounded-lg p-2" style={{ background: style.bg }}>
                            <div className="text-lg font-bold" style={{ color: style.text }}>{count}</div>
                            <div className="text-[10px]" style={{ color: style.text }}>K{k} ({pct}%)</div>
                          </div>
                        )
                      })}
                      {kademeDist.none > 0 && (
                        <div className="flex-1 text-center rounded-lg p-2 bg-muted/50">
                          <div className="text-lg font-bold text-muted-foreground">{kademeDist.none}</div>
                          <div className="text-[10px] text-muted-foreground">Belirsiz</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Test ortalamaları */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-[#E4DDD4] bg-white/60 p-3">
                      <div className="text-xs text-muted-foreground mb-1">KSE-53 GSI Ortalaması</div>
                      {testStats.avgGsi !== null ? (
                        <>
                          <span className="text-xl font-bold font-mono" style={{ color: testStats.avgGsi > KSE_NORM.gsi.mean ? "#DC2626" : "#16A34A" }}>
                            {testStats.avgGsi.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">Bel. ort. {KSE_NORM.gsi.mean}</span>
                        </>
                      ) : <span className="text-sm text-muted-foreground">Veri yok</span>}
                    </div>
                    <div className="rounded-lg border border-[#E4DDD4] bg-white/60 p-3">
                      <div className="text-xs text-muted-foreground mb-1">BFI-2 Olumsuz Duygu Ort.</div>
                      {testStats.avgOlumsuz !== null ? (
                        <>
                          <span className="text-xl font-bold font-mono" style={{ color: testStats.avgOlumsuz > 3.0 ? "#DC2626" : "#16A34A" }}>
                            {testStats.avgOlumsuz.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">/5.00</span>
                        </>
                      ) : <span className="text-sm text-muted-foreground">Veri yok</span>}
                    </div>
                  </div>

                  {/* Kurumsal tema dağılımı */}
                  {temaDist.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">Baskın Kurumsal Temalar</div>
                      <div className="space-y-1.5">
                        {temaDist.map(([tema, count]) => {
                          const max = temaDist[0][1]
                          const pct = Math.round((count / max) * 100)
                          return (
                            <div key={tema} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-36 shrink-0 truncate">{tema}</span>
                              <div className="flex-1 h-2 rounded-full bg-[#E4DDD4]/50 overflow-hidden">
                                <div className="h-full rounded-full bg-red-400" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-mono text-muted-foreground w-6 text-right">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Durum dağılımı */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Süreç Durumu</div>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(durumDist).map(([durum, count]) => (
                        <div key={durum} className="text-xs px-2.5 py-1 rounded-md bg-white/60 border border-[#E4DDD4]">
                          <span className="text-muted-foreground">{durum}:</span>{" "}
                          <span className="font-bold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </div>

          {/* Klinik Değerlendirme Raporu (Sözel) */}
          <div className="dossier-row">
            <AccordionItem value="rapor">
              <AccordionTrigger className="text-sm hover:no-underline px-4 hover:bg-white/50 transition-colors">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-1 h-5 rounded-full bg-amber-400" />
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="font-medium">Klinik Değerlendirme Raporu (Sözel)</span>
                  {raporContent && <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded ml-1">Mevcut</span>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {raporContent && (
                    <div className="flex gap-2 justify-end">
                      <Button variant={editMode ? "default" : "outline"} size="sm"
                        onClick={() => { setEditMode(true); setDraft(raporContent) }}>
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Düzenle
                      </Button>
                      {editMode && <>
                        <Button size="sm" onClick={handleSaveReport} disabled={updateReport.isPending}>
                          <Save className="w-3.5 h-3.5 mr-1" /> Kaydet
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Önizleme
                        </Button>
                      </>}
                    </div>
                  )}
                  {!raporContent && !editMode ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="text-sm">Henüz rapor üretilmedi.</p>
                      <p className="text-xs mt-1">Cowork ile rapor üretip data/raporlar/ klasörüne yazın.</p>
                    </div>
                  ) : editMode ? (
                    <Textarea value={draft} onChange={e => setDraft(e.target.value)}
                      className="min-h-[400px] font-mono text-sm" />
                  ) : (
                    <div className="prose-clinical">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{raporContent!}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </div>

          {/* Anket Raporu (Çalışan Memn. ve İyi Oluş Ank.) */}
          {mudurluk.anketRaporuHtml && (
            <div className="dossier-row">
              <AccordionItem value="anket">
                <AccordionTrigger className="text-sm hover:no-underline px-4 hover:bg-white/50 transition-colors">
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-1 h-5 rounded-full bg-teal-400" />
                    <BarChart3 className="w-4 h-4 text-teal-600" />
                    <span className="font-medium">Anket Raporu (Çalışan Memn. ve İyi Oluş Ank.)</span>
                    <Button variant="outline" size="sm" className="ml-auto h-6 text-[10px]"
                      onClick={(e) => { e.stopPropagation(); setAnketExpanded(!anketExpanded) }}>
                      {anketExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <iframe
                    src={`/api/anket-raporu/${mudurluk.anketRaporuHtml}`}
                    className={`w-full border-0 rounded-lg transition-all ${anketExpanded ? "h-[90vh]" : "h-[500px]"}`}
                    title="Anket Raporu"
                    sandbox="allow-same-origin"
                  />
                </AccordionContent>
              </AccordionItem>
            </div>
          )}

          {/* Personeller */}
          <div className="dossier-row">
            <AccordionItem value="danisanlar">
              <AccordionTrigger className="text-sm hover:no-underline px-4 hover:bg-white/50 transition-colors">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-1 h-5 rounded-full bg-indigo-400" />
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium">Danışanlar ({mDanisanlar.length})</span>
                  <span className="text-[10px] text-muted-foreground">Görüşülen: {gorusulen}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {mDanisanlar.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Bu müdürlükte danışan kaydı yok.</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E4DDD4]">
                        <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Ad Soyad</th>
                        <th className="text-center py-1.5 px-2 text-xs font-medium text-muted-foreground">Kademe</th>
                        <th className="text-center py-1.5 px-2 text-xs font-medium text-muted-foreground">GSI</th>
                        <th className="text-center py-1.5 px-2 text-xs font-medium text-muted-foreground">BFI</th>
                        <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mDanisanlar
                        .sort((a, b) => (a.triyajKademesi ?? 6) - (b.triyajKademesi ?? 6))
                        .map(d => {
                          const ks = getKademeStyle(d.triyajKademesi)
                          const bs = getBfiKademeStyle(d.bfiKademe)
                          return (
                            <tr key={d.id} className="border-b border-[#E4DDD4]/50 hover:bg-white/50 transition-colors">
                              <td className="py-1.5 px-2">
                                <Link href={`/danisanlar/${d.id}`} className="flex items-center gap-2 group">
                                  {d.fotograf ? (
                                    <img src={`/api/foto/${d.fotograf}`} alt={d.adSoyad}
                                      className="w-8 h-8 rounded-full object-cover shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                      style={{ background: ks.text || '#78716C' }}>
                                      {getInitials(d.adSoyad)}
                                    </div>
                                  )}
                                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                                    {d.adSoyad}
                                  </span>
                                </Link>
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                {d.triyajKademesi && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                                    style={{ background: ks.bg, color: ks.text }}>{d.triyajKademesi}</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-center text-xs font-mono">{d.gsiSkoru?.toFixed(2) ?? "—"}</td>
                              <td className="py-1.5 px-2 text-center">
                                {d.bfiKademe && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                                    style={{ background: bs.bg, color: bs.text }}>{d.bfiKademe}</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-xs text-muted-foreground">{d.genelDurum}</td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                )}
              </AccordionContent>
            </AccordionItem>
          </div>
        </Accordion>
      </div>
    </div>
  )
}
