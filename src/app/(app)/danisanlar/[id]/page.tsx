"use client"

import { use, useState, useEffect, useCallback, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useDanisanWithRelations } from "@/hooks/use-danisanlar"
import { useUpdateRecord } from "@/hooks/use-data"
import { useAppStore } from "@/hooks/use-recent"
import { getKademeStyle, getBfiKademeStyle, getDurumStyle, getInitials, formatDate, formatDateTime } from "@/lib/triyaj"
import { BELEDIYE_ORTALAMALARI, METRIK_INFO } from "@/lib/constants"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { GorusmeForm, type GorusmeFormHandle } from "@/components/danisan/gorusme-form"
import { SearchableTranscript } from "@/components/danisan/searchable-transcript"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Phone, ExternalLink, Edit3, Save, X, Plus, Clock, Calendar,
  FileText, ClipboardCheck, GripVertical, BarChart3, FolderOpen,
} from "lucide-react"
import type { TestSonucu, GenelDurum } from "@/types"

const DURUM_OPTIONS: GenelDurum[] = ["Henüz Görülmedi", "Süreçte", "Tamamlandı", "Takipte"]

const ALL_SECTION_IDS = ["klinik-ozet", "testler", "seans-plani", "anket", "gorusmeler"] as const
type SectionId = (typeof ALL_SECTION_IDS)[number]

const SECTION_STYLE: Record<SectionId, { border: string; iconColor: string; tab: string; icon: React.ComponentType<{ className?: string }> }> = {
  "klinik-ozet": { border: "border-l-amber-500",  iconColor: "text-amber-600",  tab: "bg-amber-400",  icon: FileText },
  "testler":     { border: "border-l-purple-500",  iconColor: "text-purple-600", tab: "bg-purple-400", icon: ClipboardCheck },
  "seans-plani": { border: "border-l-green-500",   iconColor: "text-green-600",  tab: "bg-green-400",  icon: FileText },
  "anket":       { border: "border-l-teal-500",    iconColor: "text-teal-600",   tab: "bg-teal-400",   icon: BarChart3 },
  "gorusmeler":  { border: "border-l-indigo-500",  iconColor: "text-indigo-600", tab: "bg-indigo-400", icon: Clock },
}

export default function DanisanProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const data = useDanisanWithRelations(id)
  const { addRecent, sectionOrder, setSectionOrder } = useAppStore()
  const updateDanisan = useUpdateRecord("danisanlar")
  const [gorusmeMode, setGorusmeMode] = useState(false)
  const gorusmeRef = useRef<GorusmeFormHandle>(null)
  const [editingOzet, setEditingOzet] = useState(false)
  const [ozetDraft, setOzetDraft] = useState("")
  const [editingDurum, setEditingDurum] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    if (data?.danisan) {
      addRecent({
        id: data.danisan.id,
        adSoyad: data.danisan.adSoyad,
        triyajKademesi: data.danisan.triyajKademesi,
      })
    }
  }, [data?.danisan?.id])

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    )
  }

  const { danisan: d, mudurluk, testler, planlar, notlar } = data
  const kademeStyle = getKademeStyle(d.triyajKademesi)
  const bfiStyle = getBfiKademeStyle(d.bfiKademe)
  const mudurlukAdi = mudurluk?.mudurlukAdi ?? "—"

  const birlesikTest = testler.find(t => t.testTuru === "Birleşik")
  const kseTest = testler.find(t => t.testTuru === "KSE-53")
  const bfiTest = testler.find(t => t.testTuru === "BFI-2")
  const aktivPlan = planlar.find(p => p.planDurumu === "Aktif") ?? planlar[0]
  const gorusmeNo = notlar.length + 1

  // #2 — Seans sayısı ve ortalama süre
  const seansCount = notlar.length
  const avgSureDk = seansCount > 0 ? Math.round(notlar.reduce((s, n) => s + n.sureDk, 0) / seansCount) : 0

  // Ensure order contains all section IDs (forward-compat)
  const knownIds = new Set<string>(ALL_SECTION_IDS)
  const normalizedOrder = [
    ...sectionOrder.filter(sid => knownIds.has(sid)),
    ...ALL_SECTION_IDS.filter(sid => !sectionOrder.includes(sid)),
  ]

  const visibleSections = normalizedOrder.filter(sid => {
    if (sid === "seans-plani") return !!aktivPlan
    if (sid === "anket") return !!(mudurluk && mudurluk.genelMemnuniyet !== null)
    return true
  })

  const handleSaveOzet = () => {
    updateDanisan.mutate({ id: d.id, data: { klinikOzet: ozetDraft } })
    setEditingOzet(false)
  }

  const handleDurumChange = (val: string | null) => {
    if (!val) return
    updateDanisan.mutate({ id: d.id, data: { genelDurum: val as GenelDurum } })
    setEditingDurum(false)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = normalizedOrder.indexOf(active.id as string)
    const newIdx = normalizedOrder.indexOf(over.id as string)
    if (oldIdx === -1 || newIdx === -1) return
    setSectionOrder(arrayMove(normalizedOrder, oldIdx, newIdx))
  }

  function getSectionLabel(sid: string): string {
    switch (sid) {
      case "klinik-ozet": return "Klinik Özet"
      case "testler": return "Test Raporları"
      case "seans-plani": return "Test Bazlı Seans Planı"
      case "anket": return `${mudurlukAdi} — Anket Sonuçları`
      case "gorusmeler": return `Geçmiş Seans Notları (${notlar.length})`
      default: return ""
    }
  }

  const profileContent = (
    <div className="space-y-3">
      {/* Breadcrumb — only in normal mode, hidden in görüşme mode */}
      {!gorusmeMode && (
        <Breadcrumb items={[
          { label: "Dashboard", href: "/" },
          { label: "Danışanlar", href: "/danisanlar" },
          { label: d.adSoyad },
        ]} />
      )}

      {/* Profile Header */}
      <div className="rounded-xl border border-warm-200 overflow-hidden shadow-sm shadow-warm-200/50">
        <div className="h-1" style={{ background: kademeStyle.text }} />

        <div className="px-4 py-3 space-y-2">
          {/* Row 1: Avatar + Name + Badges */}
          <div className="flex items-center gap-3">
            {d.fotograf ? (
              <img src={`/api/foto/${d.fotograf}`} alt={d.adSoyad}
                className="w-16 h-16 rounded-xl object-cover shrink-0 ring-2 ring-border" />
            ) : (
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0"
                style={{ background: kademeStyle.text }}>
                {getInitials(d.adSoyad)}
              </div>
            )}
            <h1 className="text-lg font-bold text-foreground leading-none tracking-tight">{d.adSoyad}</h1>
            <span className="text-[11px] font-mono text-muted-foreground/60">#{d.sicilNo}</span>
            {d.referansKodu && (
              <span className="text-[10px] font-mono text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded">{d.referansKodu}</span>
            )}
            {seansCount > 0 && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {seansCount} seans · {avgSureDk}dk ort.
              </span>
            )}
            {d.kseKademe && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ background: getKademeStyle(Number(d.kseKademe)).bg, color: getKademeStyle(Number(d.kseKademe)).text }}>
                KSE {d.kseKademe}
              </span>
            )}
            {d.bfiKademe && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ background: bfiStyle.bg, color: bfiStyle.text }}>
                BFI {d.bfiKademe}
              </span>
            )}
            {notlar.length > 0 && (
              <span className="flex items-center gap-px ml-1" title="Son 5 seans risk trendi">
                {notlar.slice(0, 5).reverse().map((n, i) => (
                  <span key={i} className={`text-[11px] font-bold ${
                    n.riskDegisimi === "Arttı" ? "text-red-500" : n.riskDegisimi === "Azaldı" ? "text-green-500" : "text-warm-300"
                  }`}>
                    {n.riskDegisimi === "Arttı" ? "↗" : n.riskDegisimi === "Azaldı" ? "↘" : "—"}
                  </span>
                ))}
              </span>
            )}
          </div>

          {/* Row 2: Role info + department context */}
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span>{mudurlukAdi}</span>
            {mudurluk && mudurluk.isStresi != null && (
              <span className="ml-1 inline-flex items-center gap-0.5" title={`İş stresi: %${mudurluk.isStresi.toFixed(1)}`}>
                {[1,2,3,4,5].map(i => (
                  <span key={i} className={`inline-block w-1.5 h-1.5 rounded-sm ${
                    i <= Math.round(mudurluk.isStresi! / 20) ? "bg-amber-500" : "bg-warm-200"
                  }`} />
                ))}
              </span>
            )}
            {mudurluk?.riskSeviyesi && (
              <span className={`ml-1 px-1 py-px rounded text-[9px] font-bold ${
                mudurluk.riskSeviyesi === "Yüksek" ? "bg-red-100 text-red-700" :
                mudurluk.riskSeviyesi === "Orta" ? "bg-amber-100 text-amber-700" :
                "bg-green-100 text-green-700"
              }`}>{mudurluk.riskSeviyesi}</span>
            )}
            <span className="mx-1.5 text-border">·</span>
            <span>{d.gorevUnvani}</span>
            <span className="mx-1.5 text-border">·</span>
            {editingDurum ? (
              <Select value={d.genelDurum} onValueChange={handleDurumChange}>
                <SelectTrigger className="h-5 w-32 text-[11px] border-dashed inline-flex"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURUM_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <button onClick={() => setEditingDurum(true)}
                className="font-medium hover:underline underline-offset-2 transition-colors"
                style={{ color: getDurumStyle(d.genelDurum).text }}>
                {d.genelDurum}
              </button>
            )}
          </div>

          {/* Row 3: Künye — plain inline text */}
          <div className="text-[11px] text-muted-foreground/80 leading-relaxed">
            {d.yas}y, {d.cinsiyet}
            <span className="mx-1 text-border">·</span>
            {d.medeniDurum}
            <span className="mx-1 text-border">·</span>
            {d.ogrenim}{d.bolum ? `, ${d.bolum}` : ""}
            <span className="mx-1 text-border">·</span>
            Kıdem {formatDate(d.kidemGiris)}
            <span className="mx-1 text-border">·</span>
            <a href={`tel:${d.telefon.replace(/\D/g, "")}`}
              className="text-primary hover:underline whitespace-nowrap">
              <Phone className="w-2.5 h-2.5 inline -mt-px mr-0.5" />{d.telefon}
            </a>
            {d.sonrakiRandevu && (
              <>
                <span className="mx-1 text-border">·</span>
                <span className="whitespace-nowrap font-medium text-foreground/70">
                  <Calendar className="w-2.5 h-2.5 inline -mt-px mr-0.5" />
                  {new Date(d.sonrakiRandevu).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                  {d.sonrakiRandevu.includes("T") && ` ${d.sonrakiRandevu.split("T")[1]?.slice(0, 5)}`}
                </span>
              </>
            )}
          </div>

          {/* Row 4: Actions */}
          <div className="flex gap-2 pt-1 border-t border-border/40">
            {gorusmeMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => gorusmeRef.current?.saveNote()}
                  disabled={gorusmeRef.current?.saving || !gorusmeRef.current?.hasContent}
                  title="Notu kaydet (Cmd+S)"
                  className="h-7 text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1" /> Kaydet
                </Button>
                <Button
                  size="sm"
                  onClick={() => gorusmeRef.current?.finishSession()}
                  disabled={gorusmeRef.current?.saving || !gorusmeRef.current?.hasContent}
                  className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  Seansı Bitir ({gorusmeNo}. seans)
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => {}} className="h-7 text-xs">
                  <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Test Ekle
                </Button>
                <Button variant="outline" size="sm" onClick={() => {}} className="h-7 text-xs">
                  <FileText className="w-3.5 h-3.5 mr-1" /> Plan Ekle
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Son Seans Özeti */}
      {notlar.length > 0 && (() => {
        const son = notlar[0]
        const sonTarih = new Date(son.tarih)
        const riskIcon = son.riskDegisimi === "Arttı" ? "↗" : son.riskDegisimi === "Azaldı" ? "↘" : "—"
        const riskColor = son.riskDegisimi === "Arttı" ? "text-red-600" : son.riskDegisimi === "Azaldı" ? "text-green-600" : "text-muted-foreground"
        return (
          <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-warm-400 uppercase tracking-widest">Son Seans</span>
              <span className="text-[11px] text-muted-foreground">
                {sonTarih.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} · {son.sureDk}dk
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[...son.anaTema, ...son.kurumsalTema].slice(0, 4).map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white text-warm-600 border border-warm-200">{t}</span>
              ))}
              <span className={`text-xs font-bold ${riskColor}`}>{riskIcon}</span>
              <span className="text-[10px] text-muted-foreground">→ {son.sonrakiAdim}</span>
            </div>
            {son.kisaNot && (
              <p className="text-[11px] text-warm-600 leading-snug line-clamp-2 italic">&ldquo;{son.kisaNot}&rdquo;</p>
            )}
          </div>
        )
      })()}

      {/* Klinik Dosya */}
      <div className="dossier">
        <div className="dossier-header">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FolderOpen className="w-4 h-4 text-primary/60 shrink-0" />
            <span className="text-[10px] font-semibold text-warm-600 uppercase tracking-[0.12em]">Kişinin Klinik Dosyası</span>
          </div>
          <span className="text-[10px] text-warm-400 font-mono shrink-0">#{d.sicilNo}</span>
        </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleSections} strategy={verticalListSortingStrategy}>
          <Accordion multiple>
            {visibleSections.map(sid => (
              <SortableSection
                key={sid}
                id={sid}
                label={getSectionLabel(sid)}
                extra={sid === "seans-plani" && aktivPlan?.pdfUrl ? (
                  <a href={`/api/pdf/${aktivPlan.pdfUrl.replace("data/pdf/", "")}`} target="_blank"
                    onClick={e => e.stopPropagation()}
                    className="ml-auto mr-2 text-xs text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> PDF
                  </a>
                ) : undefined}
              >
                {sid === "klinik-ozet" && (
                  <div className="callout-clinical">
                    {!editingOzet ? (
                      <div className="flex items-start justify-between gap-2">
                        <div className="prose-clinical text-sm flex-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {d.klinikOzet || "*Henüz klinik özet girilmedi.*"}
                          </ReactMarkdown>
                        </div>
                        <button onClick={() => { setEditingOzet(true); setOzetDraft(d.klinikOzet) }}
                          className="text-amber-700 hover:text-amber-900 transition-colors shrink-0">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Textarea value={ozetDraft} onChange={e => setOzetDraft(e.target.value)}
                          className="min-h-[80px] bg-white/50 border-amber-300 text-sm" />
                        <div className="flex gap-1 justify-end">
                          <button onClick={handleSaveOzet} className="text-green-700 hover:text-green-900"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingOzet(false)} className="text-red-700 hover:text-red-900"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {sid === "testler" && (
                  testler.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Henüz test sonucu yok.</p>
                  ) : (
                    <Accordion defaultValue={birlesikTest ? ["birlesik"] : []}>
                      {birlesikTest && <TestAccordionItem value="birlesik" label="Birleşik Değerlendirme" test={birlesikTest} />}
                      {kseTest && <TestAccordionItem value="kse" label="KSE-53" test={kseTest} />}
                      {bfiTest && <TestAccordionItem value="bfi" label="BFI-2" test={bfiTest} />}
                    </Accordion>
                  )
                )}

                {sid === "seans-plani" && aktivPlan && (
                  <div className="prose-clinical text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{aktivPlan.planIcerigi}</ReactMarkdown>
                  </div>
                )}

                {sid === "anket" && mudurluk && mudurluk.genelMemnuniyet !== null && (
                  <div className="grid grid-cols-5 gap-3">
                    {(["genelMemnuniyet", "isStresi", "kurumDestegi", "denge", "ruhSagligiRiski"] as const).map(key => {
                      const val = mudurluk[key]
                      const avg = BELEDIYE_ORTALAMALARI[key]
                      const info = METRIK_INFO[key]
                      if (val === null) return null
                      const diff = val - avg
                      const isGood = info.yuksekIyi ? diff >= 0 : diff <= 0
                      return (
                        <div key={key} className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground mb-1">{info.label}</div>
                          <div className="text-lg font-bold" style={{ color: isGood ? "#16A34A" : "#DC2626" }}>
                            {val.toFixed(1)}{info.unit}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Ort: {avg.toFixed(1)}{info.unit}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {sid === "gorusmeler" && (
                  notlar.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Henüz görüşme notu yok.</p>
                  ) : (
                    <Accordion defaultValue={notlar[0] ? [notlar[0].id] : []}>
                      {notlar.map((n, idx) => (
                        <AccordionItem key={n.id} value={n.id} className="border-b-0 mb-3">
                          <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
                            <AccordionTrigger className="text-sm hover:no-underline px-4 py-3 hover:bg-muted/30 data-active:bg-muted/20">
                              <div className="flex flex-col gap-1.5 text-left w-full">
                                {/* Row 1: Session number + type + date + duration */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-primary/80">S{notlar.length - idx}</span>
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-foreground/70">{n.tur}</span>
                                  <span className="text-xs text-muted-foreground">{formatDateTime(n.tarih)}</span>
                                  <span className="text-xs text-muted-foreground/60 ml-auto">{n.sureDk} dk</span>
                                </div>
                                {/* Row 2: Themes */}
                                {(n.anaTema.length > 0 || n.kurumsalTema.length > 0) && (
                                  <div className="flex gap-1 flex-wrap">
                                    {n.anaTema.map(t => (
                                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-medium">{t}</span>
                                    ))}
                                    {n.kurumsalTema.map(t => (
                                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{t}</span>
                                    ))}
                                  </div>
                                )}
                                {/* Row 3: Risk + next step */}
                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    Risk:
                                    <strong className={
                                      n.riskDegisimi === "Arttı" ? "text-red-600" :
                                      n.riskDegisimi === "Azaldı" ? "text-green-600" :
                                      "text-muted-foreground"
                                    }>{n.riskDegisimi}</strong>
                                  </span>
                                  <span className="text-border">|</span>
                                  <span>Sonraki: <strong className="text-foreground/70">{n.sonrakiAdim}</strong></span>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="px-4 pb-4 space-y-3">
                                {/* Short note summary */}
                                {n.kisaNot && (
                                  <div className="bg-muted/40 rounded-md px-3 py-2">
                                    <p className="text-xs text-foreground/70 leading-relaxed">{n.kisaNot}</p>
                                  </div>
                                )}
                                {/* Formulation + next plan if present */}
                                {(n.formulasyonGuncelleme || n.sonrakiSeansPlan) && (
                                  <div className="grid grid-cols-1 gap-2">
                                    {n.formulasyonGuncelleme && (
                                      <div className="text-xs bg-violet-50/60 rounded-md px-3 py-2">
                                        <span className="font-semibold text-violet-700">Formülasyon:</span>{" "}
                                        <span className="text-violet-900/80">{n.formulasyonGuncelleme}</span>
                                      </div>
                                    )}
                                    {n.sonrakiSeansPlan && (
                                      <div className="text-xs bg-emerald-50/60 rounded-md px-3 py-2">
                                        <span className="font-semibold text-emerald-700">Sonraki Plan:</span>{" "}
                                        <span className="text-emerald-900/80">{n.sonrakiSeansPlan}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* Full session note */}
                                <div className="prose-clinical text-sm leading-relaxed">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.serbestNot}</ReactMarkdown>
                                </div>
                                <TranscriptViewer transkriptUrl={n.transkriptUrl} insightUrl={n.insightUrl} />
                              </div>
                            </AccordionContent>
                          </div>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )
                )}
              </SortableSection>
            ))}
          </Accordion>
        </SortableContext>
      </DndContext>
      </div>
    </div>
  )

  if (gorusmeMode) {
    return (
      <div className="-m-6 h-screen">
        <PanelGroup orientation="horizontal" className="h-full">
          <Panel defaultSize={50} minSize={25}>
            <div className="h-full overflow-y-auto panel-dossier p-5">
              {profileContent}
            </div>
          </Panel>
          <PanelResizeHandle className="w-[3px] bg-warm-200 hover:w-[5px] hover:bg-primary/60 rounded-full my-4 transition-all duration-200" />
          <Panel defaultSize={62} minSize={30} className="workspace-enter">
            <GorusmeForm
              ref={gorusmeRef}
              danisanId={d.id}
              danisanAd={d.adSoyad}
              sicilNo={d.sicilNo}
              mudurlukAdi={mudurlukAdi}
              gsiSkoru={d.gsiSkoru}
              gorusmeNo={gorusmeNo}
              onClose={() => setGorusmeMode(false)}
              onSave={() => setGorusmeMode(false)}
              danisanMeta={{
                yas: d.yas,
                cinsiyet: d.cinsiyet,
                gorevUnvani: d.gorevUnvani,
                kseKademe: d.kseKademe,
                bfiKademe: d.bfiKademe,
                triyajKademesi: d.triyajKademesi,
              }}
            />
          </Panel>
        </PanelGroup>
      </div>
    )
  }

  return (
    <div className="relative pb-20">
      {profileContent}
      <div className="fixed bottom-6 right-6 z-50">
        <Button onClick={() => setGorusmeMode(true)} size="lg"
          className="rounded-full shadow-lg bg-primary hover:bg-primary/90 text-white px-6 h-12">
          <Plus className="w-5 h-5 mr-2" /> Yeni Görüşme Başlat
        </Button>
      </div>
    </div>
  )
}

/* ── Sortable Section Wrapper ─────────────────────────── */

function SortableSection({
  id,
  label,
  extra,
  children,
}: {
  id: string
  label: string
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? "relative" as const : undefined,
  }
  const sec = SECTION_STYLE[id as SectionId]
  const Icon = sec.icon

  return (
    <div ref={setNodeRef} style={style}
      className={`dossier-row ${isDragging ? "opacity-90 shadow-lg bg-white/60" : ""}`}>
      <AccordionItem value={id}>
        <AccordionTrigger className="text-sm hover:no-underline px-4 hover:bg-white/50 transition-colors duration-150">
          <div className="flex items-center gap-2.5 flex-1">
            <span {...attributes} {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none p-0.5 -ml-1 rounded hover:bg-warm-100 transition-colors">
              <GripVertical className="w-3 h-3 text-warm-300" />
            </span>
            <div className={`w-1 h-5 rounded-full ${sec.tab} shrink-0`} />
            <Icon className={`w-3.5 h-3.5 shrink-0 ${sec.iconColor}`} />
            <span className="font-medium">{label}</span>
            {extra}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4">
          {children}
        </AccordionContent>
      </AccordionItem>
    </div>
  )
}


function TranscriptViewer({ transkriptUrl, insightUrl }: { transkriptUrl?: string; insightUrl?: string }) {
  const [showTranscript, setShowTranscript] = useState(false)
  const [showInsight, setShowInsight] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [insight, setInsight] = useState("")
  const hasData = !!transkriptUrl || !!insightUrl

  const loadContent = useCallback(async (type: "transcript" | "insight") => {
    if (!transkriptUrl) return
    const fileBase = transkriptUrl.replace("data/transcripts/", "").replace(".txt", "")
    try {
      const res = await fetch(`/api/transcribe?fileBase=${fileBase}`)
      if (!res.ok) return
      const data = await res.json()
      if (type === "transcript") setTranscript(data.transcript || "Transkript bulunamadı.")
      else setInsight(data.insight || "Süpervizyon notu bulunamadı.")
    } catch {
      if (type === "transcript") setTranscript("Yüklenemedi.")
      else setInsight("Yüklenemedi.")
    }
  }, [transkriptUrl])

  return (
    <div className="mt-3 pt-3 border-t border-border/30 flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <button
          onClick={() => { if (hasData && !showTranscript && !transcript) loadContent("transcript"); setShowTranscript(!showTranscript); setShowInsight(false) }}
          disabled={!hasData}
          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
            !hasData ? "bg-muted/50 text-muted-foreground/40 cursor-not-allowed" :
            showTranscript ? "bg-green-50 text-green-700 ring-1 ring-green-200" :
            "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}>
          {showTranscript ? "▼" : "▶"} Transkript
        </button>
        <button
          onClick={() => { if (hasData && !showInsight && !insight) loadContent("insight"); setShowInsight(!showInsight); setShowTranscript(false) }}
          disabled={!hasData}
          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
            !hasData ? "bg-muted/50 text-muted-foreground/40 cursor-not-allowed" :
            showInsight ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" :
            "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}>
          {showInsight ? "▼" : "▶"} Süpervizyon
        </button>
        {!hasData && <span className="text-[10px] text-muted-foreground/40 italic">Kayıt yok</span>}
      </div>
      {showTranscript && (
        <div className="rounded-lg border border-border/50 overflow-hidden max-h-[300px]">
          <SearchableTranscript
            text={hasData ? transcript : ""}
            className="h-full max-h-[300px] bg-muted/30"
            placeholder={hasData ? "Yükleniyor..." : "Bu seansta ses kaydı yapılmadı."}
          />
        </div>
      )}
      {showInsight && (
        <div className="prose-clinical text-xs bg-amber-50/50 rounded-lg p-3 max-h-[300px] overflow-y-auto border border-amber-200/50">
          {hasData ? (
            insight ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{insight}</ReactMarkdown> : <p className="italic text-muted-foreground">Yükleniyor...</p>
          ) : (
            <p className="italic text-muted-foreground">Bu seansta süpervizyon istenmedi.</p>
          )}
        </div>
      )}
    </div>
  )
}

function TestAccordionItem({ value, label, test }: { value: string; label: string; test: TestSonucu }) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-sm hover:no-underline py-2">
        <div className="flex items-center gap-3">
          <span className="font-medium">{label}</span>
          {test.kademe && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{
                background: test.testTuru === "BFI-2" ? getBfiKademeStyle(test.kademe).bg : getKademeStyle(Number(test.kademe)).bg,
                color: test.testTuru === "BFI-2" ? getBfiKademeStyle(test.kademe).text : getKademeStyle(Number(test.kademe)).text,
              }}>
              {test.testTuru === "BFI-2" ? `BFI-${test.kademe}` : `Kademe ${test.kademe}`}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatDate(test.uygulamaTarihi)}</span>
          {test.pdfUrl && (
            <a href={`/api/pdf/${test.pdfUrl.replace("data/pdf/", "")}`} target="_blank"
              onClick={e => e.stopPropagation()}
              className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> PDF
            </a>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="prose-clinical text-sm pt-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{test.raporIcerigi}</ReactMarkdown>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
