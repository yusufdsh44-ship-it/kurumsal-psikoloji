"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  MessageSquare, EyeOff, User, Mail, Send, Check, Clock,
  AlertTriangle, Filter, ChevronDown, ChevronUp,
} from "lucide-react"
import type { Mesaj } from "@/types"

const KATEGORI_RENK: Record<string, { bg: string; text: string }> = {
  "Görüşme Hakkında Soru": { bg: "#EFF6FF", text: "#2563EB" },
  "Öneri / Geri Bildirim": { bg: "#F0FDF4", text: "#16A34A" },
  "Şikayet": { bg: "#FFF7ED", text: "#EA580C" },
  "Genel Soru": { bg: "#F5F0EB", text: "#78716C" },
  "Acil Destek Talebi": { bg: "#FEF2F2", text: "#DC2626" },
}

export default function MesajlarPage() {
  const queryClient = useQueryClient()

  const { data: mesajlar, isLoading } = useQuery<Mesaj[]>({
    queryKey: ["supabase-mesajlar"],
    queryFn: async () => {
      const res = await fetch("/api/mesajlar")
      if (!res.ok) throw new Error("Mesajlar yüklenemedi")
      return res.json()
    },
    refetchInterval: 30_000, // 30 sn'de bir yeni mesajları kontrol et
  })

  const updateMesaj = useMutation({
    mutationFn: async (payload: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch("/api/mesajlar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: payload.id, ...payload.data }),
      })
      if (!res.ok) throw new Error("Güncelleme hatası")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-mesajlar"] })
    },
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cevapDraft, setCevapDraft] = useState("")
  const [filter, setFilter] = useState<"all" | "unread" | "anonim" | "kimlikli">("all")

  const filtered = useMemo(() => {
    if (!mesajlar) return []
    const result = [...mesajlar].sort((a, b) =>
      new Date(b.olusturmaTarihi).getTime() - new Date(a.olusturmaTarihi).getTime()
    )
    switch (filter) {
      case "unread": return result.filter(m => !m.okundu)
      case "anonim": return result.filter(m => m.anonim)
      case "kimlikli": return result.filter(m => !m.anonim)
      default: return result
    }
  }, [mesajlar, filter])

  const unreadCount = mesajlar?.filter(m => !m.okundu).length ?? 0
  const selected = mesajlar?.find(m => m.id === selectedId)

  const handleSelect = useCallback((m: Mesaj) => {
    setSelectedId(m.id)
    setCevapDraft(m.cevap ?? "")
    if (!m.okundu) {
      updateMesaj.mutate({ id: m.id, data: { okundu: true } })
    }
  }, [updateMesaj])

  const handleCevapGonder = useCallback(() => {
    if (!selectedId || !cevapDraft.trim()) return
    updateMesaj.mutate({
      id: selectedId,
      data: { cevap: cevapDraft.trim() },
    })
  }, [selectedId, cevapDraft, updateMesaj])

  if (isLoading) return <div className="h-64 bg-muted rounded-xl animate-pulse" />

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Mesajlar" }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mesajlar</h1>
        {unreadCount > 0 && (
          <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
            {unreadCount} okunmamış
          </span>
        )}
      </div>

      {/* Filtreler */}
      <div className="flex gap-2">
        {([
          { key: "all", label: "Tümü", count: mesajlar?.length ?? 0 },
          { key: "unread", label: "Okunmamış", count: unreadCount },
          { key: "anonim", label: "Anonim", count: mesajlar?.filter(m => m.anonim).length ?? 0 },
          { key: "kimlikli", label: "Kimlikli", count: mesajlar?.filter(m => !m.anonim).length ?? 0 },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Mesaj listesi */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Mesaj bulunmuyor.
              </CardContent>
            </Card>
          ) : (
            filtered.map(m => {
              const kr = KATEGORI_RENK[m.kategori] ?? KATEGORI_RENK["Genel Soru"]
              const isSelected = m.id === selectedId
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : m.okundu
                        ? "border-border/40 bg-card hover:border-border"
                        : "border-primary/20 bg-amber-50/30 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {m.anonim ? (
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground/50" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-primary/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">
                          {m.anonim ? "Anonim" : m.adSoyad}
                        </span>
                        {!m.okundu && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: kr.bg, color: kr.text }}>
                          {m.kategori}
                        </span>
                        {m.cevap && <Check className="w-3 h-3 text-green-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.mesaj}</p>
                      <span className="text-[10px] text-muted-foreground/50 mt-1 block">
                        {new Date(m.olusturmaTarihi).toLocaleDateString("tr-TR", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Mesaj detay */}
        <div className="lg:col-span-3">
          {selected ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {selected.anonim ? (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {selected.anonim ? "Anonim Mesaj" : selected.adSoyad}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {!selected.anonim && selected.mudurluk && <span>{selected.mudurluk}</span>}
                      {selected.email && (
                        <span className="flex items-center gap-0.5">
                          <Mail className="w-3 h-3" />{selected.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: (KATEGORI_RENK[selected.kategori] ?? KATEGORI_RENK["Genel Soru"]).bg, color: (KATEGORI_RENK[selected.kategori] ?? KATEGORI_RENK["Genel Soru"]).text }}>
                    {selected.kategori}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mesaj içeriği */}
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.mesaj}</p>
                  <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground/50">
                    <Clock className="w-3 h-3" />
                    {new Date(selected.olusturmaTarihi).toLocaleString("tr-TR")}
                  </div>
                </div>

                {/* Mevcut cevap */}
                {selected.cevap && (
                  <div className="rounded-xl bg-green-50/50 border border-green-100 p-4">
                    <div className="text-[10px] font-medium text-green-700 mb-1">Cevabınız:</div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.cevap}</p>
                    {selected.cevapTarihi && (
                      <div className="text-[10px] text-green-600/50 mt-2">
                        {new Date(selected.cevapTarihi).toLocaleString("tr-TR")}
                      </div>
                    )}
                  </div>
                )}

                {/* Cevap yaz */}
                {selected.email && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {selected.cevap ? "Cevabı Güncelle" : "Cevap Yaz"}
                    </label>
                    <Textarea
                      value={cevapDraft}
                      onChange={e => setCevapDraft(e.target.value)}
                      placeholder="Cevabınızı yazın..."
                      className="min-h-[80px] text-sm"
                    />
                    <Button size="sm" onClick={handleCevapGonder}
                      disabled={!cevapDraft.trim() || updateMesaj.isPending}>
                      <Send className="w-3.5 h-3.5 mr-1" />
                      {updateMesaj.isPending ? "Kaydediliyor..." : "Cevabı Kaydet"}
                    </Button>
                  </div>
                )}

                {!selected.email && !selected.cevap && (
                  <p className="text-xs text-muted-foreground/50 italic text-center py-2">
                    E-posta adresi belirtilmemiş — cevap gönderilemez.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                Okumak için bir mesaj seçin.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
