"use client"

import { useState, useMemo, useCallback } from "react"
import { useCollection } from "@/hooks/use-data"
import { useMudurlukMap, useFilteredDanisanlar } from "@/hooks/use-danisanlar"
import { getKademeStyle, getBfiKademeStyle, getDurumStyle, getInitials, formatDate } from "@/lib/triyaj"
import { KADEME_RENK, BFI_KADEME_RENK, BELEDIYE_ORTALAMALARI } from "@/lib/constants"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ArrowUpDown, Download } from "lucide-react"
import Link from "next/link"
import type { Danisan, Mudurluk, GorusmeNotu } from "@/types"

type SortKey =
  | "adSoyad"
  | "triyajKademesi"
  | "gsiSkoru"
  | "kseKademe"
  | "bfiKademe"
  | "genelDurum"
  | "sonrakiRandevu"
  | "mudurlukId"

const KSE_KADEME_OPTIONS = ["1", "2", "3", "4", "5"] as const
const BFI_KADEME_OPTIONS = ["A", "B", "C"] as const
const DURUM_OPTIONS = [
  "Henüz Görülmedi",
  "Süreçte",
  "Tamamlandı",
  "Takipte",
] as const

export default function DanisanlarPage() {
  const [search, setSearch] = useState("")
  const [selectedKseKademe, setSelectedKseKademe] = useState<string[]>([])
  const [selectedBfiKademe, setSelectedBfiKademe] = useState<string[]>([])
  const [selectedMudurluk, setSelectedMudurluk] = useState<string>("")
  const [selectedDurum, setSelectedDurum] = useState<string>("")
  const [sortBy, setSortBy] = useState<SortKey>("triyajKademesi")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const { data: mudurlukler } = useCollection("mudurlukler")
  const { data: notlar } = useCollection("gorusmeNotlari")
  const mudurlukMap = useMudurlukMap()

  // Her danisan icin son gorusmedeki etiketler (anaTema + kurumsalTema)
  const etiketMap = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!notlar) return map
    // Notlari tarihe gore sirala (en yeni once)
    const sorted = [...(notlar as GorusmeNotu[])].sort((a, b) => b.tarih.localeCompare(a.tarih))
    for (const n of sorted) {
      if (map.has(n.danisanId)) continue // sadece son gorusme
      const tags = [...n.anaTema, ...n.kurumsalTema]
      if (tags.length > 0) map.set(n.danisanId, tags)
    }
    return map
  }, [notlar])

  const { data: filtered, allData, isLoading } = useFilteredDanisanlar({
    search,
    kseKademe: selectedKseKademe,
    bfiKademe: selectedBfiKademe,
    mudurlukId: selectedMudurluk || undefined,
    durum: selectedDurum || undefined,
    sortBy,
    sortDir,
  })

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortBy === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      } else {
        setSortBy(key)
        setSortDir("asc")
      }
    },
    [sortBy],
  )

  const toggleKseKademe = useCallback((k: string) => {
    setSelectedKseKademe((prev) =>
      prev.includes(k) ? prev.filter((v) => v !== k) : [...prev, k],
    )
  }, [])

  const toggleBfiKademe = useCallback((k: string) => {
    setSelectedBfiKademe((prev) =>
      prev.includes(k) ? prev.filter((v) => v !== k) : [...prev, k],
    )
  }, [])

  const acilYuksek = useMemo(
    () =>
      (allData ?? []).filter(
        (d) => d.triyajKademesi === 1 || d.triyajKademesi === 2,
      ),
    [allData],
  )

  const bekleyen = useMemo(
    () =>
      (allData ?? []).filter((d) => d.genelDurum === "Henüz Görülmedi"),
    [allData],
  )

  const groupedByMudurluk = useMemo(() => {
    const map = new Map<string, Danisan[]>()
    for (const d of filtered) {
      const key = d.mudurlukId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return map
  }, [filtered])

  const kanbanColumns = useMemo(() => {
    const cols: Record<string, Danisan[]> = {
      "1": [],
      "2": [],
      "3": [],
      "4": [],
      "5": [],
      belirsiz: [],
    }
    for (const d of filtered) {
      const k = d.triyajKademesi
      if (k && k >= 1 && k <= 5) {
        cols[String(k)].push(d)
      } else {
        cols.belirsiz.push(d)
      }
    }
    return cols
  }, [filtered])

  if (isLoading || !allData) {
    return <PageSkeleton />
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Danışanlar" },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Danışanlar</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} / {allData.length} kayıt
          </span>
          <button
            onClick={() => {
              const header = "Sicil No;Ad Soyad;Müdürlük;Personel Tipi;KSE Kademe;BFI Kademe;GSI;Durum;Son Görüşme\n"
              const rows = filtered.map(d => [
                d.sicilNo,
                d.adSoyad,
                mudurlukMap.get(d.mudurlukId)?.mudurlukAdi ?? "",
                d.personelTipi,
                d.kseKademe ?? "",
                d.bfiKademe ?? "",
                d.gsiSkoru?.toFixed(2) ?? "",
                d.genelDurum,
                d.sonGorusme?.split("T")[0] ?? "",
              ].join(";")).join("\n")
              const bom = "\uFEFF"
              const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `danisanlar_${new Date().toISOString().split("T")[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Dışa Aktar
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ad, soyad veya sicil no ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* KSE Kademe filter */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground/70 mr-0.5">KSE:</span>
              {KSE_KADEME_OPTIONS.map((k) => {
                const style = getKademeStyle(Number(k))
                const active = selectedKseKademe.includes(k)
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleKseKademe(k)}
                    className="w-7 h-7 rounded-md text-xs font-bold transition-all border"
                    style={{
                      background: active ? style.bg : "transparent",
                      color: active ? style.text : "var(--muted-foreground)",
                      borderColor: active ? style.text + "40" : "var(--border)",
                      opacity: active ? 1 : 0.6,
                    }}
                  >
                    {k}
                  </button>
                )
              })}
              {selectedKseKademe.length > 0 && (
                <button type="button" onClick={() => setSelectedKseKademe([])}
                  className="text-[10px] text-muted-foreground hover:text-foreground ml-0.5 transition-colors">
                  x
                </button>
              )}
            </div>

            {/* BFI Kademe filter */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground/70 mr-0.5">BFI:</span>
              {BFI_KADEME_OPTIONS.map((k) => {
                const style = BFI_KADEME_RENK[k]
                const active = selectedBfiKademe.includes(k)
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleBfiKademe(k)}
                    className="w-7 h-7 rounded-md text-xs font-bold transition-all border"
                    style={{
                      background: active ? style.bg : "transparent",
                      color: active ? style.text : "var(--muted-foreground)",
                      borderColor: active ? style.text + "40" : "var(--border)",
                      opacity: active ? 1 : 0.6,
                    }}
                  >
                    {k}
                  </button>
                )
              })}
              {selectedBfiKademe.length > 0 && (
                <button type="button" onClick={() => setSelectedBfiKademe([])}
                  className="text-[10px] text-muted-foreground hover:text-foreground ml-0.5 transition-colors">
                  x
                </button>
              )}
            </div>

            {/* Mudurluk select */}
            <Select
              value={selectedMudurluk || null}
              onValueChange={(val) =>
                setSelectedMudurluk(!val || val === "__all__" ? "" : val)
              }
            >
              <SelectTrigger className="min-w-[180px]">
                <SelectValue placeholder="Müdürlük" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tüm Müdürlükler</SelectItem>
                {(mudurlukler ?? [])
                  .slice()
                  .sort((a, b) => a.mudurlukAdi.localeCompare(b.mudurlukAdi, "tr"))
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.mudurlukAdi}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Durum select */}
            <Select
              value={selectedDurum || null}
              onValueChange={(val) =>
                setSelectedDurum(!val || val === "__all__" ? "" : val)
              }
            >
              <SelectTrigger className="min-w-[150px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tüm Durumlar</SelectItem>
                {DURUM_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="tumu">
        <TabsList>
          <TabsTrigger value="tumu">
            Tümü
            <span className="ml-1 text-xs opacity-60">({filtered.length})</span>
          </TabsTrigger>
          <TabsTrigger value="acil">
            Acil+Yüksek
            <span className="ml-1 text-xs opacity-60">({acilYuksek.length})</span>
          </TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="mudurluk">Müdürlüğe Göre</TabsTrigger>
          <TabsTrigger value="bekleyen">
            Bekleyen
            <span className="ml-1 text-xs opacity-60">({bekleyen.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Tumu */}
        <TabsContent value="tumu">
          <Card>
            <CardContent className="p-0">
              <DanisanTable
                danisanlar={filtered}
                mudurlukMap={mudurlukMap}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Acil+Yuksek */}
        <TabsContent value="acil">
          <Card>
            <CardContent className="p-0">
              {acilYuksek.length === 0 ? (
                <EmptyState message="Acil veya yüksek öncelikli danışan bulunmuyor." />
              ) : (
                <DanisanTable
                  danisanlar={acilYuksek}
                  mudurlukMap={mudurlukMap}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Kanban */}
        <TabsContent value="kanban">
          <KanbanView
            columns={kanbanColumns}
            mudurlukMap={mudurlukMap}
          />
        </TabsContent>

        {/* Tab: Müdürlüğe Göre */}
        <TabsContent value="mudurluk">
          <MudurlukGroupView
            grouped={groupedByMudurluk}
            mudurlukMap={mudurlukMap}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </TabsContent>

        {/* Tab: Bekleyen */}
        <TabsContent value="bekleyen">
          <Card>
            <CardContent className="p-0">
              {bekleyen.length === 0 ? (
                <EmptyState message="Bekleyen danışan bulunmuyor." />
              ) : (
                <DanisanTable
                  danisanlar={bekleyen}
                  mudurlukMap={mudurlukMap}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ─── Table ─────────────────────────────────────────────── */

interface TableProps {
  danisanlar: Danisan[]
  mudurlukMap: Map<string, Mudurluk>
  sortBy: SortKey
  sortDir: "asc" | "desc"
  onSort: (key: SortKey) => void
}

const PAGE_SIZE = 50

function DanisanTable({
  danisanlar,
  mudurlukMap,
  sortBy,
  sortDir,
  onSort,
}: TableProps) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(danisanlar.length / PAGE_SIZE)
  const paged = danisanlar.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Filtre/sıralama değişince ilk sayfaya dön
  useMemo(() => setPage(0), [danisanlar])

  if (danisanlar.length === 0) {
    return <EmptyState message="Filtrelere uyan danışan bulunamadı." />
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40">
              <SortableHeader
                label="Danışan"
                sortKey="adSoyad"
                currentSort={sortBy}
                currentDir={sortDir}
                onSort={onSort}
                align="left"
                rowSpan={2}
              />
              <SortableHeader
                label="Müdürlük"
                sortKey="mudurlukId"
                currentSort={sortBy}
                currentDir={sortDir}
                onSort={onSort}
                align="left"
                rowSpan={2}
              />
              <th colSpan={2} className="py-1.5 px-1.5 text-center text-[10px] font-semibold text-amber-700 bg-amber-50/50 border-b border-amber-200/60 rounded-t">
                Müdürlük Anketi
              </th>
              <th colSpan={3} className="py-1.5 px-1.5 text-center text-[10px] font-semibold text-purple-700 bg-purple-50/50 border-b border-purple-200/60 rounded-t">
                Klinik Veri
              </th>
              <SortableHeader
                label="Durum"
                sortKey="genelDurum"
                currentSort={sortBy}
                currentDir={sortDir}
                onSort={onSort}
                align="left"
                rowSpan={2}
              />
              <SortableHeader
                label="Randevular"
                sortKey="sonrakiRandevu"
                currentSort={sortBy}
                currentDir={sortDir}
                onSort={onSort}
                align="left"
                rowSpan={2}
              />
            </tr>
            <tr className="border-b border-border">
              <th className="py-1 px-1.5 text-center text-[10px] font-medium text-amber-600/80 bg-amber-50/30">Denge</th>
              <th className="py-1 px-1.5 text-center text-[10px] font-medium text-amber-600/80 bg-amber-50/30">Ruh S.</th>
              <th className="py-1 px-1.5 text-center text-[10px] font-medium text-purple-600/80 bg-purple-50/30 cursor-pointer" onClick={() => onSort("triyajKademesi")}>Triyaj</th>
              <th className="py-1 px-1.5 text-center text-[10px] font-medium text-purple-600/80 bg-purple-50/30 cursor-pointer" onClick={() => onSort("gsiSkoru")}>KSE-53</th>
              <th className="py-1 px-1.5 text-center text-[10px] font-medium text-purple-600/80 bg-purple-50/30 cursor-pointer" onClick={() => onSort("bfiKademe")}>BFI-2</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((d) => (
              <DanisanRow
                key={d.id}
                danisan={d}
                mudurlukAdi={mudurlukMap.get(d.mudurlukId)?.mudurlukAdi ?? ""}
                mudurluk={mudurlukMap.get(d.mudurlukId)}
                etiketler={etiketMap.get(d.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, danisanlar.length)} / {danisanlar.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 text-xs rounded-md border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              Önceki
            </button>
            <span className="text-xs text-muted-foreground px-2">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1 text-xs rounded-md border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align,
  rowSpan,
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey
  currentDir: "asc" | "desc"
  onSort: (key: SortKey) => void
  align: "left" | "center"
  rowSpan?: number
}) {
  const active = currentSort === sortKey
  return (
    <th
      rowSpan={rowSpan}
      className={`py-2.5 px-3 text-sm font-medium text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors ${
        align === "center" ? "text-center" : "text-left"
      }`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`w-3 h-3 transition-opacity ${
            active ? "opacity-100 text-foreground" : "opacity-30"
          }`}
        />
        {active && (
          <span className="text-[10px] opacity-60">
            {currentDir === "asc" ? "\u2191" : "\u2193"}
          </span>
        )}
      </span>
    </th>
  )
}

function DanisanRow({
  danisan: d,
  mudurlukAdi,
  mudurluk,
  etiketler,
}: {
  danisan: Danisan
  mudurlukAdi: string
  mudurluk?: Mudurluk
  etiketler?: string[]
}) {
  const kademeStyle = getKademeStyle(d.triyajKademesi)
  const bfiStyle = getBfiKademeStyle(d.bfiKademe)
  const durumStyle = getDurumStyle(d.genelDurum)

  const dengeColor = mudurluk?.denge != null
    ? mudurluk.denge < 0 ? "#DC2626" : mudurluk.denge <= 10 ? "#CA8A04" : "#16A34A"
    : undefined
  const ruhColor = mudurluk?.ruhSagligiRiski != null
    ? mudurluk.ruhSagligiRiski > 60 ? "#DC2626" : mudurluk.ruhSagligiRiski > 40 ? "#CA8A04" : "#16A34A"
    : undefined

  return (
    <tr className="border-b border-border/40 hover:bg-muted/50 transition-colors">
      {/* Danisan */}
      <td className="py-2.5 px-3">
        <Link href={`/danisanlar/${d.id}`} className="flex items-center gap-2.5 group">
          {d.fotograf ? (
            <img src={`/api/foto/${d.fotograf}`} alt={d.adSoyad}
              className="w-11 h-11 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: kademeStyle.text }}>
              {getInitials(d.adSoyad)}
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{d.adSoyad}</div>
            <div className="text-[11px] text-muted-foreground">
              <span className="font-mono">#{d.sicilNo}</span>
              {d.gorevUnvani && <span className="ml-1">· {d.gorevUnvani}</span>}
            </div>
          </div>
        </Link>
      </td>
      {/* Mudurluk */}
      <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[160px] truncate">
        {mudurlukAdi}
      </td>
      {/* Denge (Anket) */}
      <td className="py-2.5 px-3 text-center">
        {mudurluk?.denge != null ? (() => {
          const diff = mudurluk.denge - BELEDIYE_ORTALAMALARI.denge
          return (
            <div className="flex flex-col items-center">
              <span className="text-xs font-mono font-bold" style={{ color: dengeColor }}>
                {mudurluk.denge.toFixed(1)}
              </span>
              <span className={`text-[9px] font-mono ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
              </span>
            </div>
          )
        })() : null}
      </td>
      {/* Ruh S. (Anket) */}
      <td className="py-2.5 px-3 text-center">
        {mudurluk?.ruhSagligiRiski != null ? (() => {
          const diff = mudurluk.ruhSagligiRiski - BELEDIYE_ORTALAMALARI.ruhSagligiRiski
          return (
            <div className="flex flex-col items-center">
              <span className="text-xs font-mono font-bold" style={{ color: ruhColor }}>
                %{mudurluk.ruhSagligiRiski.toFixed(0)}
              </span>
              <span className={`text-[9px] font-mono ${diff <= 0 ? "text-green-600" : "text-red-500"}`}>
                {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
              </span>
            </div>
          )
        })() : null}
      </td>
      {/* Triyaj */}
      <td className="py-2.5 px-3 text-center">
        {d.triyajKademesi ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold"
            style={{ background: kademeStyle.bg, color: kademeStyle.text }}>
            {d.triyajKademesi}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">?</span>
        )}
      </td>
      {/* KSE-53: GSI + Kademe */}
      <td className="py-2.5 px-3 text-center">
        {d.gsiSkoru != null ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-mono font-bold">{d.gsiSkoru.toFixed(2)}</span>
            {d.kseKademe && (
              <span className="text-[10px] px-1.5 py-px rounded font-semibold"
                style={{ background: getKademeStyle(Number(d.kseKademe)).bg, color: getKademeStyle(Number(d.kseKademe)).text }}>
                K{d.kseKademe}
              </span>
            )}
          </div>
        ) : null}
      </td>
      {/* BFI-2 */}
      <td className="py-2.5 px-3 text-center">
        {d.bfiKademe ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: bfiStyle.bg, color: bfiStyle.text }}>
            BFI-{d.bfiKademe}
          </span>
        ) : null}
      </td>
      {/* Durum */}
      <td className="py-2.5 px-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium"
          style={{ background: durumStyle.bg, color: durumStyle.text }}>
          {d.genelDurum}
        </span>
      </td>
      {/* Randevular — geçmiş + gelecek */}
      <td className="py-2.5 px-3">
        <div className="flex flex-col gap-0.5">
          {d.sonGorusme && (
            <span className="text-[10px] text-muted-foreground/60">
              {new Date(d.sonGorusme).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
              {d.sonGorusme.includes("T") && ` ${d.sonGorusme.split("T")[1]?.slice(0, 5)}`}
              <span className="ml-0.5 italic">geçmiş</span>
            </span>
          )}
          {d.sonrakiRandevu && (
            <span className={`text-[10px] font-medium ${new Date(d.sonrakiRandevu) >= new Date() ? "text-primary" : "text-muted-foreground/60"}`}>
              {new Date(d.sonrakiRandevu).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
              {d.sonrakiRandevu.includes("T") && ` ${d.sonrakiRandevu.split("T")[1]?.slice(0, 5)}`}
              {new Date(d.sonrakiRandevu) >= new Date() && <span className="ml-0.5">→</span>}
            </span>
          )}
          {!d.sonGorusme && !d.sonrakiRandevu && (
            <span className="text-[10px] text-muted-foreground/40">—</span>
          )}
        </div>
      </td>
    </tr>
  )
}

/* ─── Kanban View ───────────────────────────────────────── */

const KANBAN_COLUMNS = [
  { key: "1", label: "Kademe 1 \u2014 Acil" },
  { key: "2", label: "Kademe 2 \u2014 Y\u00FCksek" },
  { key: "3", label: "Kademe 3 \u2014 Orta" },
  { key: "4", label: "Kademe 4 \u2014 D\u00FC\u015F\u00FCk" },
  { key: "5", label: "Kademe 5 \u2014 Sa\u011Fl\u0131kl\u0131" },
  { key: "belirsiz", label: "Belirsiz" },
] as const

function KanbanView({
  columns,
  mudurlukMap,
}: {
  columns: Record<string, Danisan[]>
  mudurlukMap: Map<string, Mudurluk>
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map(({ key, label }) => {
        const items = columns[key] ?? []
        const kademeNum = key === "belirsiz" ? null : Number(key)
        const style = getKademeStyle(kademeNum)
        return (
          <div key={key} className="flex-shrink-0 w-[260px]">
            <div
              className="flex items-center justify-between px-3 py-2 rounded-t-xl"
              style={{ background: style.bg }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: style.text }}
              >
                {label}
              </span>
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: style.text + "18",
                  color: style.text,
                }}
              >
                {items.length}
              </span>
            </div>
            <div className="bg-muted/30 rounded-b-xl border border-border/40 border-t-0 p-2 space-y-2 min-h-[120px]">
              {items.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6">
                  Danışan yok
                </div>
              )}
              {items.slice(0, 50).map((d) => (
                <KanbanCard
                  key={d.id}
                  danisan={d}
                  mudurlukAdi={
                    mudurlukMap.get(d.mudurlukId)?.mudurlukAdi ?? "\u2014"
                  }
                  borderColor={style.text}
                />
              ))}
              {items.length > 50 && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  +{items.length - 50} daha
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({
  danisan: d,
  mudurlukAdi,
  borderColor,
}: {
  danisan: Danisan
  mudurlukAdi: string
  borderColor: string
}) {
  return (
    <Link href={`/danisanlar/${d.id}`}>
      <div
        className="bg-background rounded-lg shadow-sm p-3 border border-border/40 hover:shadow-md transition-shadow cursor-pointer"
        style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
      >
        <div className="text-sm font-medium text-foreground mb-0.5">
          {d.adSoyad}
        </div>
        <div className="text-[11px] text-muted-foreground mb-1.5 truncate">
          {d.gorevUnvani ? `${d.gorevUnvani} · ${mudurlukAdi}` : mudurlukAdi}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">GSI</span>
          <span className="text-xs font-mono font-semibold text-foreground">
            {d.gsiSkoru !== null ? d.gsiSkoru.toFixed(2) : "\u2014"}
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ─── Mudurluk Group View ───────────────────────────────── */

function MudurlukGroupView({
  grouped,
  mudurlukMap,
  sortBy,
  sortDir,
  onSort,
}: {
  grouped: Map<string, Danisan[]>
  mudurlukMap: Map<string, Mudurluk>
  sortBy: SortKey
  sortDir: "asc" | "desc"
  onSort: (key: SortKey) => void
}) {
  const entries = Array.from(grouped.entries()).sort((a, b) => {
    const nameA =
      mudurlukMap.get(a[0])?.mudurlukAdi ?? ""
    const nameB =
      mudurlukMap.get(b[0])?.mudurlukAdi ?? ""
    return nameA.localeCompare(nameB, "tr")
  })

  if (entries.length === 0) {
    return <EmptyState message="Filtrelere uyan danışan bulunamadı." />
  }

  return (
    <div className="space-y-4">
      {entries.map(([mudurlukId, danisanlar]) => {
        const mudurluk = mudurlukMap.get(mudurlukId)
        return (
          <Card key={mudurlukId}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {mudurluk?.mudurlukAdi ?? "Bilinmeyen Müdürlük"}
              </h3>
              <span className="text-xs text-muted-foreground">
                {danisanlar.length} ki\u015Fi
              </span>
            </div>
            <CardContent className="p-0">
              <DanisanTable
                danisanlar={danisanlar}
                mudurlukMap={mudurlukMap}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/* ─── Empty + Skeleton ──────────────────────────────────── */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground text-sm">
      {message}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div>
      <div className="h-4 w-48 bg-muted rounded mb-4 animate-pulse" />
      <div className="h-8 w-40 bg-muted rounded mb-6 animate-pulse" />
      <div className="h-12 bg-muted rounded-xl mb-4 animate-pulse" />
      <div className="h-8 w-80 bg-muted rounded mb-4 animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}
