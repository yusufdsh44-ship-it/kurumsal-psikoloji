"use client"

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useMemo } from "react"
import { nanoid } from "nanoid"
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels"
import { useStopwatch } from "@/hooks/use-stopwatch"
import { useKeyboardShortcut } from "@/hooks/use-keyboard"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { BlockNotepad, blocksToMarkdown, type BlockNotepadHandle } from "@/components/danisan/block-notepad"
import { SearchableTranscript } from "@/components/danisan/searchable-transcript"
import { RandevuDialog } from "@/components/danisan/randevu-dialog"
import { useCreateRecord, useUpdateRecord } from "@/hooks/use-data"
import { ANA_TEMALAR, KURUMSAL_TEMALAR, KADEME_RENK, BFI_KADEME_RENK } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Clock,
  Pause,
  Play,
  Save,
  X,
  AlertTriangle,
  Minus,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Mic,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PenLine,
  BookOpen,
  Eye,
  Wrench,
} from "lucide-react"
import type {
  AnaTema,
  KurumsalTema,
  GorusmeTuru,
  RiskDegisimi,
  SonrakiAdim,
  GorusmeNotu,
} from "@/types"

interface GorusmeFormProps {
  danisanId: string
  danisanAd: string
  sicilNo?: number
  mudurlukAdi?: string
  gsiSkoru?: number | null
  gorusmeNo: number
  onClose: () => void
  onSave: () => void
  danisanMeta?: {
    yas?: number
    cinsiyet?: string
    gorevUnvani?: string
    kseKademe?: string | null
    bfiKademe?: string | null
    triyajKademesi?: number | null
  }
}

const GORUSME_TURLERI: GorusmeTuru[] = [
  "İlk Görüşme",
  "Takip",
  "Kriz",
  "Test Geri Bildirimi",
]

const SONRAKI_ADIMLAR: SonrakiAdim[] = [
  "Takip Planla",
  "Psikiyatri Yönlendir",
  "Tekrar Test",
  "Sonlandır",
  "Acil",
]

const RISK_OPTIONS: { mapped: RiskDegisimi; icon: typeof TrendingUp; active: string }[] = [
  { mapped: "Arttı", icon: TrendingUp, active: "text-red-600 bg-red-50 ring-1 ring-red-200" },
  { mapped: "Aynı", icon: Minus, active: "text-yellow-600 bg-yellow-50 ring-1 ring-yellow-200" },
  { mapped: "Azaldı", icon: TrendingDown, active: "text-green-600 bg-green-50 ring-1 ring-green-200" },
]

export interface GorusmeFormHandle {
  saveNote: () => Promise<void>
  finishSession: () => Promise<void>
  hasContent: boolean
  saving: boolean
  gorusmeNo: number
}

export const GorusmeForm = forwardRef<GorusmeFormHandle, GorusmeFormProps>(function GorusmeForm({
  danisanId,
  danisanAd,
  sicilNo = 0,
  mudurlukAdi = "",
  gsiSkoru = null,
  gorusmeNo,
  onClose,
  onSave,
  danisanMeta,
}, ref) {
  const stopwatch = useStopwatch()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const createNote = useCreateRecord("gorusmeNotlari")
  const updateDanisan = useUpdateRecord("danisanlar")

  const sessionDate = new Date().toISOString().split("T")[0]
  const recorder = useAudioRecorder(danisanId, danisanAd, sessionDate, gorusmeNo, {
    danisanId,
    adSoyad: danisanAd,
    sicilNo,
    mudurluk: mudurlukAdi,
    kseKademe: danisanMeta?.kseKademe ?? null,
    bfiKademe: danisanMeta?.bfiKademe ?? null,
    gsiSkoru,
    transkriptDosya: "",
    insightDosya: "",
    baslamaSaati: new Date().toISOString(),
  })

  const [liveTab, setLiveTab] = useState<string>("transcript")
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Note fields
  const [serbestBlocks, setSerbestBlocks] = useState<string[]>([])
  const blockNotepadRef = useRef<BlockNotepadHandle>(null)
  const [hasPendingInput, setHasPendingInput] = useState(false)
  const serbestNot = useMemo(() => blocksToMarkdown(serbestBlocks), [serbestBlocks])
  const [anamnezNot, setAnamnezNot] = useState("")
  const [noteTab, setNoteTab] = useState<string>("serbest")
  const [gozlemDuygudurum, setGozlemDuygudurum] = useState("")
  const [gozlemDavranis, setGozlemDavranis] = useState("")
  const [gozlemIfadeler, setGozlemIfadeler] = useState("")
  const [formulasyonGuncelleme, setFormulasyonGuncelleme] = useState("")
  const [sonrakiSeansPlan, setSonrakiSeansPlan] = useState("")

  // Metadata (always visible)
  const [gorusmeTuru, setGorusmeTuru] = useState<GorusmeTuru>("Takip")
  const [selectedAnaTema, setSelectedAnaTema] = useState<string[]>([])
  const [selectedKurumsalTema, setSelectedKurumsalTema] = useState<string[]>([])
  const [anaManuelInput, setAnaManuelInput] = useState("")
  const [krmManuelInput, setKrmManuelInput] = useState("")
  const [riskDegisimi, setRiskDegisimi] = useState<RiskDegisimi>("Aynı")
  const [sonrakiAdim, setSonrakiAdim] = useState<SonrakiAdim>("Takip Planla")
  const [saving, setSaving] = useState(false)
  const [showRandevuDialog, setShowRandevuDialog] = useState(false)
  const [showCrisisAlert, setShowCrisisAlert] = useState(false)
  const [crisisChecks, setCrisisChecks] = useState([false, false, false, false])
  const [suggestedDate, setSuggestedDate] = useState<Date | undefined>()
  const [saveError, setSaveError] = useState<string | null>(null)

  // Live feed panel
  const [liveFeedOpen, setLiveFeedOpen] = useState(true)

  // Transcript auto-scroll
  const [userScrolledUp, setUserScrolledUp] = useState(false)

  // Kronometre manuel başlatılır — otomatik başlamaz

  useEffect(() => {
    const timer = setTimeout(() => blockNotepadRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!userScrolledUp && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [recorder.transcript, userScrolledUp])

  const handleTranscriptScroll = useCallback((e: React.UIEvent<HTMLPreElement>) => {
    const el = e.currentTarget
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setUserScrolledUp(!isAtBottom)
  }, [])

  const toggleAnaTema = (tema: string) => {
    setSelectedAnaTema((prev) =>
      prev.includes(tema) ? prev.filter((t) => t !== tema) : [...prev, tema]
    )
  }

  const toggleKurumsalTema = (tema: string) => {
    setSelectedKurumsalTema((prev) =>
      prev.includes(tema) ? prev.filter((t) => t !== tema) : [...prev, tema]
    )
  }

  const addManuelAnaTema = () => {
    const val = anaManuelInput.trim()
    if (val && !selectedAnaTema.includes(val)) {
      setSelectedAnaTema((prev) => [...prev, val])
    }
    setAnaManuelInput("")
  }

  const addManuelKrmTema = () => {
    const val = krmManuelInput.trim()
    if (val && !selectedKurumsalTema.includes(val)) {
      setSelectedKurumsalTema((prev) => [...prev, val])
    }
    setKrmManuelInput("")
  }

  const buildFullNote = useCallback((overrideSerbest?: string) => {
    const sections: string[] = []
    if (anamnezNot.trim()) sections.push(`## Anamnez\n${anamnezNot.trim()}`)
    if (gozlemDuygudurum.trim()) sections.push(`## Duygudurum / Görünüm\n${gozlemDuygudurum.trim()}`)
    if (gozlemDavranis.trim()) sections.push(`## Davranışsal Gözlem\n${gozlemDavranis.trim()}`)
    if (gozlemIfadeler.trim()) sections.push(`## Önemli İfadeler\n${gozlemIfadeler.trim()}`)

    const serbest = overrideSerbest ?? serbestNot
    if (sections.length > 0 && serbest.trim()) {
      return sections.join("\n\n") + `\n\n---\n${serbest.trim()}`
    }
    if (sections.length > 0) {
      return sections.join("\n\n")
    }
    return serbest.trim()
  }, [serbestNot, anamnezNot, gozlemDuygudurum, gozlemDavranis, gozlemIfadeler])

  const hasContent =
    serbestNot.trim().length > 0 ||
    hasPendingInput ||
    anamnezNot.trim().length > 0 ||
    gozlemDuygudurum.trim().length > 0 ||
    gozlemDavranis.trim().length > 0 ||
    gozlemIfadeler.trim().length > 0

  const totalChars =
    serbestNot.length + anamnezNot.length + gozlemDuygudurum.length + gozlemDavranis.length +
    gozlemIfadeler.length + formulasyonGuncelleme.length + sonrakiSeansPlan.length

  // Sadece notu kaydet — seans açık kalır, kayıt devam eder
  const handleSaveNote = async () => {
    const pending = blockNotepadRef.current?.flush() ?? ""
    const withPending = pending
      ? blocksToMarkdown([...serbestBlocks, pending])
      : serbestNot
    const fullNote = buildFullNote(withPending)
    if (!fullNote) { setSaveError("Görüşme notu boş olamaz."); return }

    setSaving(true)
    setSaveError(null)

    const now = new Date().toISOString()
    const note: GorusmeNotu = {
      id: nanoid(),
      danisanId,
      tarih: now,
      sureDk: stopwatch.minutes || 1,
      gorusmeNo,
      tur: gorusmeTuru,
      anaTema: selectedAnaTema,
      kurumsalTema: selectedKurumsalTema,
      riskDegisimi,
      sonrakiAdim,
      kisaNot: fullNote.slice(0, 120),
      serbestNot: fullNote,
      anamnezNot: anamnezNot.trim(),
      formulasyonGuncelleme: formulasyonGuncelleme.trim(),
      sonrakiSeansPlan: sonrakiSeansPlan.trim(),
      transkriptUrl: recorder.transcript ? recorder.transcriptFile : undefined,
      insightUrl: recorder.insight ? recorder.insightFile : undefined,
    }

    try {
      await createNote.mutateAsync(note)
      await updateDanisan.mutateAsync({
        id: danisanId, data: { sonGorusme: now, genelDurum: "Süreçte" as const, gorusmeYapildi: true },
      })
      setSaveError(null)
    } catch {
      setSaveError("Kayıt sırasında bir hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  // Seansı bitir — notu kaydet + kaydı kapat + paneli kapat
  const handleFinishSession = async () => {
    const pending = blockNotepadRef.current?.flush() ?? ""
    const withPending = pending
      ? blocksToMarkdown([...serbestBlocks, pending])
      : serbestNot
    const fullNote = buildFullNote(withPending)
    if (!fullNote) { setSaveError("Görüşme notu boş olamaz."); return }

    setSaving(true)
    setSaveError(null)

    const now = new Date().toISOString()
    const note: GorusmeNotu = {
      id: nanoid(),
      danisanId,
      tarih: now,
      sureDk: stopwatch.minutes || 1,
      gorusmeNo,
      tur: gorusmeTuru,
      anaTema: selectedAnaTema,
      kurumsalTema: selectedKurumsalTema,
      riskDegisimi,
      sonrakiAdim,
      kisaNot: fullNote.slice(0, 120),
      serbestNot: fullNote,
      anamnezNot: anamnezNot.trim(),
      formulasyonGuncelleme: formulasyonGuncelleme.trim(),
      sonrakiSeansPlan: sonrakiSeansPlan.trim(),
      transkriptUrl: recorder.transcript ? recorder.transcriptFile : undefined,
      insightUrl: recorder.insight ? recorder.insightFile : undefined,
    }

    // Smart durum: Sonlandır → Tamamlandı, else → Süreçte
    const newDurum = sonrakiAdim === "Sonlandır" ? "Tamamlandı" : "Süreçte"

    // Psikiyatri sevk notu
    const sevkNote = sonrakiAdim === "Psikiyatri Yönlendir"
      ? `\n\n[SEVK: Psikiyatri — ${new Date().toLocaleDateString("tr-TR")}]`
      : ""

    try {
      await createNote.mutateAsync(note)
      await updateDanisan.mutateAsync({
        id: danisanId,
        data: {
          sonGorusme: now,
          genelDurum: newDurum,
          gorusmeYapildi: true,
          ...(sevkNote ? { klinikOzet: (danisanMeta as Record<string, unknown>)?.klinikOzet + sevkNote } : {}),
        },
      })

      // Kaydı bitir (eğer aktifse)
      if (recorder.isActive) {
        await recorder.saveRecording()
      }

      // Kademeye göre önerilen randevu tarihi
      const kademe = danisanMeta?.triyajKademesi ?? 3
      const dayOffset = kademe <= 1 ? 3 : kademe <= 2 ? 7 : kademe <= 4 ? 14 : 30
      const suggested = new Date()
      suggested.setDate(suggested.getDate() + dayOffset)
      setSuggestedDate(suggested)

      // Kriz kontrolü: risk arttı + kademe 1-2
      if (riskDegisimi === "Arttı" && kademe <= 2) {
        setShowCrisisAlert(true)
        return // Dialog kapandığında devam edecek
      }

      // Normal akış
      if (sonrakiAdim === "Sonlandır") {
        onSave()
        onClose()
      } else {
        setShowRandevuDialog(true)
      }
    } catch {
      setSaveError("Kayıt sırasında bir hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  // Kriz dialog'u kapatıldığında devam
  const handleCrisisAcknowledge = () => {
    setShowCrisisAlert(false)
    if (sonrakiAdim === "Sonlandır") {
      onSave()
      onClose()
    } else {
      setShowRandevuDialog(true)
    }
  }

  useImperativeHandle(ref, () => ({
    saveNote: handleSaveNote,
    finishSession: handleFinishSession,
    hasContent,
    saving,
    gorusmeNo,
  }), [hasContent, saving, gorusmeNo])

  useKeyboardShortcut(
    "s",
    (e) => {
      e.preventDefault()
      handleSaveNote()
    },
    { meta: true }
  )

  const now = new Date()
  const formattedDate = now.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  const formattedDay = now.toLocaleDateString("tr-TR", { weekday: "long" })
  const formattedTime = now.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  const kseStyle = danisanMeta?.kseKademe
    ? KADEME_RENK[Number(danisanMeta.kseKademe)] ?? null
    : null
  const bfiStyle = danisanMeta?.bfiKademe
    ? BFI_KADEME_RENK[danisanMeta.bfiKademe] ?? null
    : null

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ===== HEADER ===== */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-white via-white to-amber-50/30 border-b border-amber-100 px-5 pt-5 pb-3 shrink-0">
        {/* Row 1: Session info + recording + stopwatch */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{formattedDate}</span>
                <span className="text-xs text-primary/70 font-medium">{formattedDay}, {formattedTime}</span>
                <span className="text-border">|</span>
                <span className="text-base font-bold text-primary tracking-tight">Seans {gorusmeNo}</span>
                {stopwatch.running && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Audio Recording Controls */}
            {!recorder.isActive ? (
              <button
                onClick={recorder.startRecording}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all"
                title="Ses kaydı başlat"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Kayıt</span>
              </button>
            ) : (
              <div className="flex items-center gap-0.5 rounded-lg border border-red-200 overflow-hidden">
                <div className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium ${
                  recorder.isRecording ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                }`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    recorder.isRecording ? "bg-red-500 animate-pulse" : "bg-blue-400"
                  }`} />
                  <span>{recorder.isRecording ? "Kayıt" : "Durduruldu"}</span>
                </div>
                {recorder.isRecording ? (
                  <button onClick={recorder.pauseRecording} className="p-1.5 hover:bg-red-100 transition-colors" title="Durdur">
                    <Pause className="w-3.5 h-3.5 text-red-600" />
                  </button>
                ) : (
                  <button onClick={recorder.resumeRecording} className="p-1.5 hover:bg-blue-100 transition-colors" title="Devam et">
                    <Play className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                )}
                <button onClick={recorder.saveRecording} className="p-1.5 hover:bg-green-100 transition-colors" title="Kaydet ve bitir">
                  <Save className="w-3.5 h-3.5 text-green-600" />
                </button>
                {showDiscardConfirm ? (
                  <div className="flex items-center gap-0.5 px-1">
                    <button onClick={() => { recorder.discardRecording(); setShowDiscardConfirm(false) }}
                      className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded hover:bg-red-200">Sil</button>
                    <button onClick={() => setShowDiscardConfirm(false)}
                      className="px-1.5 py-0.5 text-[10px] bg-muted rounded hover:bg-muted/80">İptal</button>
                  </div>
                ) : (
                  <button onClick={() => setShowDiscardConfirm(true)} className="p-1.5 hover:bg-red-100 transition-colors" title="Kaydı sil">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            {/* Stopwatch */}
            <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors ${
              stopwatch.minutes >= 45 ? "bg-red-50" : stopwatch.minutes >= 40 ? "bg-amber-50" : "bg-muted"
            }`}>
              <Clock className={`w-3.5 h-3.5 ${
                stopwatch.minutes >= 45 ? "text-red-500" : stopwatch.minutes >= 40 ? "text-amber-500" : "text-muted-foreground"
              }`} />
              <span className={`font-mono text-sm font-semibold tabular-nums ${
                stopwatch.minutes >= 45 ? "text-red-600 animate-pulse" : stopwatch.minutes >= 40 ? "text-amber-600" : "text-foreground"
              }`}>
                {stopwatch.display}
              </span>
              <button
                onClick={stopwatch.toggle}
                className="p-0.5 rounded hover:bg-background/80 transition-colors"
                title={stopwatch.running ? "Duraklat" : "Devam Et"}
              >
                {stopwatch.running ? (
                  <Pause className="w-3 h-3 text-primary" />
                ) : (
                  <Play className="w-3 h-3 text-primary" />
                )}
              </button>
            </div>

            <Button variant="ghost" size="icon-sm" onClick={onClose} title="Kapat">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

      </div>

      {/* ===== METADATA STRIP ===== */}
      <div className="px-4 py-2.5 border-b border-warm-100 bg-warm-50/50 shrink-0 space-y-2">
        {/* Ana Tema */}
        <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
          <span className="text-[10px] font-semibold text-amber-600/70 uppercase tracking-widest w-8 shrink-0">Ana</span>
          {selectedAnaTema.map((tema) => (
            <button
              key={tema}
              onClick={() => toggleAnaTema(tema)}
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                tema === "İntihar Riski"
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : (ANA_TEMALAR as readonly string[]).includes(tema)
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              {tema === "İntihar Riski" && <AlertTriangle className="w-2.5 h-2.5" />}
              {tema}
              <X className="w-2.5 h-2.5 opacity-60" />
            </button>
          ))}
          <Popover>
            <PopoverTrigger className="p-1 rounded-md hover:bg-muted transition-colors" title="Tema ekle">
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-80">
              <div className="flex flex-wrap gap-1.5">
                {ANA_TEMALAR.map((tema) => {
                  const selected = selectedAnaTema.includes(tema)
                  const isRisk = tema === ("İntihar Riski" as AnaTema)
                  return (
                    <button
                      key={tema}
                      onClick={() => toggleAnaTema(tema)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        selected
                          ? isRisk
                            ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                            : "bg-primary/10 text-primary ring-1 ring-primary/30"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {isRisk && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                      {tema}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
          <input
            type="text"
            value={anaManuelInput}
            onChange={(e) => setAnaManuelInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManuelAnaTema() } }}
            placeholder="Yaz + Enter..."
            className="text-[10px] bg-transparent border-b border-transparent focus:border-primary/40 outline-none w-20 px-1 py-0.5 text-muted-foreground placeholder:text-muted-foreground/40 transition-colors"
          />
          {selectedAnaTema.length === 0 && !anaManuelInput && (
            <span className="text-[10px] text-muted-foreground/50 italic">Tema ekle...</span>
          )}
        </div>

        {/* Kurumsal Tema */}
        <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
          <span className="text-[10px] font-semibold text-blue-600/60 uppercase tracking-widest w-8 shrink-0">Krm</span>
          {selectedKurumsalTema.map((tema) => (
            <button
              key={tema}
              onClick={() => toggleKurumsalTema(tema)}
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                (KURUMSAL_TEMALAR as readonly string[]).includes(tema)
                  ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              {tema}
              <X className="w-2.5 h-2.5 opacity-60" />
            </button>
          ))}
          <Popover>
            <PopoverTrigger className="p-1 rounded-md hover:bg-muted transition-colors" title="Kurumsal tema ekle">
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-72">
              <div className="flex flex-wrap gap-1.5">
                {KURUMSAL_TEMALAR.map((tema) => {
                  const selected = selectedKurumsalTema.includes(tema)
                  return (
                    <button
                      key={tema}
                      onClick={() => toggleKurumsalTema(tema)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        selected
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-300"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {tema}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
          <input
            type="text"
            value={krmManuelInput}
            onChange={(e) => setKrmManuelInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManuelKrmTema() } }}
            placeholder="Yaz + Enter..."
            className="text-[10px] bg-transparent border-b border-transparent focus:border-blue-400 outline-none w-20 px-1 py-0.5 text-muted-foreground placeholder:text-muted-foreground/40 transition-colors"
          />
          {selectedKurumsalTema.length === 0 && !krmManuelInput && (
            <span className="text-[10px] text-muted-foreground/50 italic">Kurumsal tema ekle...</span>
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      {liveFeedOpen ? (
        <PanelGroup orientation="vertical" className="flex-1 min-h-0">
          {/* ZONE A (TOP): Notes */}
          <Panel defaultSize={35} minSize={15}>
            <Tabs value={noteTab} onValueChange={(v) => v && setNoteTab(v)} className="h-full gap-0">
              <div className="px-4 border-b border-border/50 shrink-0 flex items-center justify-between">
                <TabsList variant="line" className="h-8">
                  <TabsTrigger value="serbest" className="text-[13px] px-3 gap-1.5"><PenLine className="w-3.5 h-3.5" />Serbest</TabsTrigger>
                  <TabsTrigger value="anamnez" className="text-[13px] px-3 gap-1.5"><BookOpen className="w-3.5 h-3.5" />Anamnez</TabsTrigger>
                  <TabsTrigger value="gorunum" className="text-[13px] px-3 gap-1.5"><Eye className="w-3.5 h-3.5" />Görünüm</TabsTrigger>
                  <TabsTrigger value="teknik" className="text-[13px] px-3 gap-1.5"><Wrench className="w-3.5 h-3.5" />Teknik</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Select value={gorusmeTuru} onValueChange={(v) => v && setGorusmeTuru(v as GorusmeTuru)}>
                    <SelectTrigger size="sm" className="h-6 w-auto text-[10px] gap-1 px-2 border-dashed">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GORUSME_TURLERI.map((tur) => (
                        <SelectItem key={tur} value={tur}>{tur}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center">
                    {RISK_OPTIONS.map(({ mapped, icon: Icon, active }) => (
                      <button
                        key={mapped}
                        onClick={() => setRiskDegisimi(mapped)}
                        className={`p-1 rounded transition-all ${
                          riskDegisimi === mapped ? active : "text-muted-foreground/40 hover:text-muted-foreground"
                        }`}
                        title={mapped}
                      >
                        <Icon className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                  <Select value={sonrakiAdim} onValueChange={(v) => v && setSonrakiAdim(v as SonrakiAdim)}>
                    <SelectTrigger size="sm" className="h-6 w-auto text-[10px] gap-1 px-2 border-dashed">
                      <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SONRAKI_ADIMLAR.map((adim) => (
                        <SelectItem key={adim} value={adim}>{adim}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="serbest" className="min-h-0">
                <BlockNotepad
                  ref={blockNotepadRef}
                  blocks={serbestBlocks}
                  onChange={setSerbestBlocks}
                  onPendingChange={setHasPendingInput}
                  placeholder="Gözlemlerinizi yazın, Enter ile kaydedin..."
                />
              </TabsContent>

              <TabsContent value="anamnez" className="min-h-0 overflow-y-auto notebook-lines pt-3 pr-4">
                <Textarea
                  value={anamnezNot}
                  onChange={(e) => setAnamnezNot(e.target.value)}
                  placeholder="Öz geçmiş, aile öyküsü, tıbbi geçmiş, gelişimsel bilgiler..."
                  className="w-full h-full min-h-[100px] resize-none border-0 bg-transparent text-[14px] leading-[28px] placeholder:text-muted-foreground/30 placeholder:italic focus-visible:ring-0 focus-visible:border-0 p-0"
                  style={{ fieldSizing: "content" } as React.CSSProperties}
                />
              </TabsContent>

              <TabsContent value="gorunum" className="min-h-0 overflow-y-auto notebook-lines pt-3 pr-4 space-y-4">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-1 block">
                    Duygudurum / Görünüm
                  </label>
                  <Textarea
                    value={gozlemDuygudurum}
                    onChange={(e) => setGozlemDuygudurum(e.target.value)}
                    placeholder="Genel duygudurum, yüz ifadesi, beden dili..."
                    className="text-[14px] leading-[28px] resize-none border-0 bg-transparent placeholder:text-muted-foreground/30 placeholder:italic focus-visible:ring-0 p-0"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-1 block">
                    Davranışsal Gözlem
                  </label>
                  <Textarea
                    value={gozlemDavranis}
                    onChange={(e) => setGozlemDavranis(e.target.value)}
                    placeholder="Göz teması, konuşma hızı, savunma belirtileri..."
                    className="text-[14px] leading-[28px] resize-none border-0 bg-transparent placeholder:text-muted-foreground/30 placeholder:italic focus-visible:ring-0 p-0"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-1 block">
                    Önemli İfadeler
                  </label>
                  <Textarea
                    value={gozlemIfadeler}
                    onChange={(e) => setGozlemIfadeler(e.target.value)}
                    placeholder='Danışanın sözlerinden doğrudan alıntılar...'
                    className="text-[14px] leading-[28px] resize-none border-0 bg-transparent placeholder:text-muted-foreground/30 placeholder:italic focus-visible:ring-0 p-0"
                    rows={2}
                  />
                </div>
              </TabsContent>

              <TabsContent value="teknik" className="min-h-0 overflow-y-auto notebook-lines pt-3 pr-4 space-y-4">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-1 block">
                    Formülasyon Güncellemesi
                  </label>
                  <Textarea
                    value={formulasyonGuncelleme}
                    onChange={(e) => setFormulasyonGuncelleme(e.target.value)}
                    placeholder="Formülasyon güncellemesi, hipotez revizyonu, tetikleyici-yanıt döngüleri..."
                    className="text-[14px] leading-[28px] resize-none border-0 bg-transparent placeholder:text-muted-foreground/30 placeholder:italic focus-visible:ring-0 p-0"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-1 block">
                    Sonraki Seans Planı
                  </label>
                  <Textarea
                    value={sonrakiSeansPlan}
                    onChange={(e) => setSonrakiSeansPlan(e.target.value)}
                    placeholder="Hedefler, teknikler (BDT, EMDR, MI...), ev ödevleri..."
                    className="text-[14px] leading-[28px] resize-none border-0 bg-transparent placeholder:text-muted-foreground/30 placeholder:italic focus-visible:ring-0 p-0"
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </Panel>

          <PanelResizeHandle className="h-1.5 my-0.5 mx-4 rounded-full bg-border hover:bg-primary transition-colors" />

          {/* ZONE B (BOTTOM): Live Feed — Transkript & Supervizyon */}
          <Panel defaultSize={65} minSize={20}>
            <Tabs value={liveTab} onValueChange={(v) => v && setLiveTab(v)} className="h-full gap-0">
              <div className="flex items-center px-4 border-b border-border/50 shrink-0">
                <TabsList className="h-7">
                  <TabsTrigger value="transcript" className="text-xs px-3 py-1 flex items-center gap-1.5">
                    <Mic className="w-3 h-3" />
                    Transkript
                    {recorder.transcript && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
                  </TabsTrigger>
                  <TabsTrigger value="supervision" className="text-xs px-3 py-1 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Süpervizyon
                    {recorder.insight && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
                  </TabsTrigger>
                </TabsList>
                {recorder.isRecording && (
                  <span className="ml-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                )}
                {recorder.chunkCount > 0 && (
                  <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {recorder.chunkCount} chunk
                  </span>
                )}
                {recorder.error && (
                  <span className="ml-2 text-[10px] text-red-600">{recorder.error}</span>
                )}
                <button
                  onClick={() => setLiveFeedOpen(false)}
                  className="ml-auto p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                  title="Canlı feed'i gizle"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <TabsContent value="transcript" className="min-h-0 !mt-0">
                <SearchableTranscript
                  text={recorder.transcript}
                  className="h-full bg-muted/30"
                  placeholder={recorder.isRecording
                    ? "Ses kaydediliyor... İlk transkript ~2 dakika sonra görünecek."
                    : "Transkript henüz yok. Kayıt butonuna basarak başlayın."}
                />
              </TabsContent>

              <TabsContent value="supervision" className="min-h-0 overflow-y-auto !mt-0">
                <div className="px-4 py-2">
                  {recorder.insight ? (
                    <div className="prose-clinical text-xs [&_blockquote]:text-sm [&_blockquote]:font-medium">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{recorder.insight}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 py-12 opacity-40">
                      <Sparkles className="w-5 h-5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Cowork&apos;ten süpervizyon talep edin</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Panel>
        </PanelGroup>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Notes take full remaining space */}
          <Tabs value={noteTab} onValueChange={(v) => v && setNoteTab(v)} className="flex-1 min-h-0 gap-0">
            <div className="px-4 border-b border-border/50 shrink-0 flex items-center justify-between">
              <TabsList variant="line" className="h-8">
                <TabsTrigger value="serbest" className="text-[13px] px-3">Serbest</TabsTrigger>
                <TabsTrigger value="anamnez" className="text-[13px] px-3">Anamnez</TabsTrigger>
                <TabsTrigger value="gorunum" className="text-[13px] px-3">Görünüm</TabsTrigger>
                <TabsTrigger value="teknik" className="text-[13px] px-3">Teknik</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-1.5 shrink-0">
                <Select value={gorusmeTuru} onValueChange={(v) => v && setGorusmeTuru(v as GorusmeTuru)}>
                  <SelectTrigger size="sm" className="h-6 w-auto text-[10px] gap-1 px-2 border-dashed">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GORUSME_TURLERI.map((tur) => (
                      <SelectItem key={tur} value={tur}>{tur}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center">
                  {RISK_OPTIONS.map(({ mapped, icon: Icon, active }) => (
                    <button
                      key={mapped}
                      onClick={() => setRiskDegisimi(mapped)}
                      className={`p-1 rounded transition-all ${
                        riskDegisimi === mapped ? active : "text-muted-foreground/40 hover:text-muted-foreground"
                      }`}
                      title={mapped}
                    >
                      <Icon className="w-3 h-3" />
                    </button>
                  ))}
                </div>
                <Select value={sonrakiAdim} onValueChange={(v) => v && setSonrakiAdim(v as SonrakiAdim)}>
                  <SelectTrigger size="sm" className="h-6 w-auto text-[10px] gap-1 px-2 border-dashed">
                    <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SONRAKI_ADIMLAR.map((adim) => (
                      <SelectItem key={adim} value={adim}>{adim}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="serbest" className="min-h-0">
              <BlockNotepad
                ref={blockNotepadRef}
                blocks={serbestBlocks}
                onChange={setSerbestBlocks}
                onPendingChange={setHasPendingInput}
                placeholder="Gözlemlerinizi yazın, Enter ile kaydedin..."
              />
            </TabsContent>

            <TabsContent value="anamnez" className="min-h-0 overflow-y-auto p-4">
              <Textarea
                value={anamnezNot}
                onChange={(e) => setAnamnezNot(e.target.value)}
                placeholder="Öz geçmiş, aile öyküsü, tıbbi geçmiş, gelişimsel bilgiler..."
                className="w-full h-full min-h-[100px] resize-none border-0 bg-transparent text-[14px] leading-[1.8] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-0 p-0"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
            </TabsContent>

            <TabsContent value="gorunum" className="min-h-0 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Duygudurum / Görünüm
                </label>
                <Textarea
                  value={gozlemDuygudurum}
                  onChange={(e) => setGozlemDuygudurum(e.target.value)}
                  placeholder="Genel duygudurum, yüz ifadesi, beden dili..."
                  className="text-sm resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Davranışsal Gözlem
                </label>
                <Textarea
                  value={gozlemDavranis}
                  onChange={(e) => setGozlemDavranis(e.target.value)}
                  placeholder="Göz teması, konuşma hızı, savunma belirtileri..."
                  className="text-sm resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Önemli İfadeler
                </label>
                <Textarea
                  value={gozlemIfadeler}
                  onChange={(e) => setGozlemIfadeler(e.target.value)}
                  placeholder='Danışanın sözlerinden doğrudan alıntılar...'
                  className="text-sm resize-none"
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="teknik" className="min-h-0 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Formülasyon Güncellemesi
                </label>
                <Textarea
                  value={formulasyonGuncelleme}
                  onChange={(e) => setFormulasyonGuncelleme(e.target.value)}
                  placeholder="Formülasyon güncellemesi, hipotez revizyonu, tetikleyici-yanıt döngüleri..."
                  className="text-sm resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Sonraki Seans Planı
                </label>
                <Textarea
                  value={sonrakiSeansPlan}
                  onChange={(e) => setSonrakiSeansPlan(e.target.value)}
                  placeholder="Hedefler, teknikler (BDT, EMDR, MI...), ev ödevleri..."
                  className="text-sm resize-none"
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Collapsed live feed bar */}
          <button
            onClick={() => setLiveFeedOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 border-t border-border bg-muted/20 hover:bg-muted/40 transition-colors shrink-0"
          >
            {recorder.isRecording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
            <Mic className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Transkript & Supervizyon</span>
            {recorder.transcript && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            {recorder.insight && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            <ChevronUp className="ml-auto w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Save error toast */}
      {saveError && (
        <div className="shrink-0 px-4 py-1.5 bg-red-50 border-t border-red-200 flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          <span className="text-xs text-red-600">{saveError}</span>
        </div>
      )}

      <RandevuDialog
        open={showRandevuDialog}
        onOpenChange={setShowRandevuDialog}
        danisanId={danisanId}
        danisanAd={danisanAd}
        initialDate={suggestedDate}
        onScheduled={() => { onSave(); onClose() }}
        onSkip={() => { onSave(); onClose() }}
      />

      {/* Kriz güvenlik hatırlatıcısı */}
      {showCrisisAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-900">Risk Artisi Tespit Edildi</h3>
                  <p className="text-sm text-red-700">Kademe {danisanMeta?.triyajKademesi} — {danisanAd}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">
                Bu danışanın riski <strong>arttı</strong> olarak işaretlendi ve <strong>yüksek öncelikli</strong> kademede.
              </p>
              <div className="bg-amber-50 rounded-lg px-4 py-3 text-sm text-amber-900 space-y-2">
                <p className="font-semibold">Güvenlik Kontrol Listesi:</p>
                {[
                  "İntihar/kendine zarar düşüncesi değerlendirildi",
                  "Güvenlik planı oluşturuldu",
                  "Acil iletişim bilgileri güncellendi",
                  "Psikiyatri yönlendirmesi değerlendirildi",
                ].map((label, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={crisisChecks[i]}
                      onChange={() => setCrisisChecks(prev => { const n = [...prev]; n[i] = !n[i]; return n })}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span className={crisisChecks[i] ? "line-through text-amber-600" : ""}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-6 py-3 bg-muted/30 flex justify-end gap-2 border-t">
              <Button variant="outline" size="sm" onClick={handleCrisisAcknowledge}
                disabled={!crisisChecks.every(Boolean)}>
                {crisisChecks.every(Boolean) ? "Değerlendirme Yapıldı" : "Tüm maddeleri işaretleyin"}
              </Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!crisisChecks.every(Boolean)}
                onClick={handleCrisisAcknowledge}>
                Onayla ve Devam Et
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})
