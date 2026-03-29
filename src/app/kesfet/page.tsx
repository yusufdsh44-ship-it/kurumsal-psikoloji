"use client"

import { useState, useEffect, useCallback } from "react"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  BookOpen, Check, Trash2, Star, Plus, Heart, Clock, User,
  Shield, ChevronUp, Quote, Sparkles, AlertCircle,
} from "lucide-react"

interface Paylasim {
  id: string
  adSoyad: string | null
  mudurluk: string | null
  anonim: boolean
  kitapAdi: string
  yazar: string
  alinti: string
  yorum: string | null
  olusturmaTarihi: string
  onaylandi: boolean
  psikologBegeni: boolean
  likeSayisi: number
  kaynak: string
}

export default function KesfetPage() {
  const [paylasimlar, setPaylasimlar] = useState<Paylasim[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ kitapAdi: "", yazar: "", alinti: "", yorum: "" })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/kesfet-moderasyon")
      const data = await res.json()
      setPaylasimlar(Array.isArray(data) ? data : [])
    } catch { setPaylasimlar([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const bekleyen = paylasimlar.filter(p => !p.onaylandi)
  const onayli = paylasimlar.filter(p => p.onaylandi)
  const psikologPaylasim = onayli.filter(p => p.kaynak === "psikolog")

  const api = async (method: string, body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch("/api/kesfet-moderasyon", {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      return true
    } catch {
      setError("İşlem gerçekleştirilemedi. Lütfen tekrar deneyin.")
      setTimeout(() => setError(""), 3000)
      return false
    }
  }

  const handleApprove = async (id: string) => {
    if (await api("PATCH", { id, onaylandi: true })) {
      setPaylasimlar(prev => prev.map(p => p.id === id ? { ...p, onaylandi: true } : p))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bu paylaşımı silmek istediğinize emin misiniz?")) return
    if (await api("DELETE", { id })) {
      setPaylasimlar(prev => prev.filter(p => p.id !== id))
    }
  }

  const handleToggleBegeni = async (id: string, current: boolean) => {
    if (await api("PATCH", { id, psikologBegeni: !current })) {
      setPaylasimlar(prev => prev.map(p => p.id === id ? { ...p, psikologBegeni: !current } : p))
    }
  }

  const handleSubmit = async () => {
    if (!form.kitapAdi) { setError("Kitap adı gerekli."); return }
    if (!form.yazar) { setError("Yazar gerekli."); return }
    if (form.alinti.length < 10) { setError("Alıntı en az 10 karakter olmalı."); return }
    setError("")
    setSubmitting(true)
    if (await api("POST", form)) {
      setForm({ kitapAdi: "", yazar: "", alinti: "", yorum: "" })
      setFormOpen(false)
      fetchData()
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="h-6 w-48 bg-muted rounded animate-pulse" />
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
      </div>
      <div className="h-64 bg-muted rounded-xl animate-pulse" />
    </div>
  )

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Keşfet" }]} />

      {/* Hata mesajı */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Keşfet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Personelin kitap paylaşımları ve psikolog seçkileri</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? <ChevronUp className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {formOpen ? "Kapat" : "Paylaşım Ekle"}
        </Button>
      </div>

      {/* Psikolog paylaşım formu */}
      {formOpen && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Psikolog Olarak Paylaş
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Kitap Adı</label>
                <Input placeholder="Kitap adı" value={form.kitapAdi} onChange={e => setForm(f => ({ ...f, kitapAdi: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Yazar</label>
                <Input placeholder="Yazar adı" value={form.yazar} onChange={e => setForm(f => ({ ...f, yazar: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Alıntı</label>
              <Textarea placeholder="En az 10 karakter..." value={form.alinti} onChange={e => setForm(f => ({ ...f, alinti: e.target.value }))} className="min-h-[80px]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Yorum (opsiyonel)</label>
              <Textarea placeholder="Neden bu kitabı öneriyorsunuz?" value={form.yorum} onChange={e => setForm(f => ({ ...f, yorum: e.target.value }))} className="min-h-[60px]" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>İptal</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !form.kitapAdi || !form.yazar || form.alinti.length < 10}>
                {submitting ? "Kaydediliyor..." : "Paylaş"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI özet */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-foreground">{paylasimlar.length}</div>
            <div className="text-[10px] text-muted-foreground">Toplam Paylaşım</div>
          </CardContent>
        </Card>
        <Card className={bekleyen.length > 0 ? "border-amber-200 bg-amber-50/30" : ""}>
          <CardContent className="pt-4 pb-3 text-center">
            <div className={`text-2xl font-bold ${bekleyen.length > 0 ? "text-amber-600" : "text-foreground"}`}>{bekleyen.length}</div>
            <div className="text-[10px] text-muted-foreground">Onay Bekleyen</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-foreground">{psikologPaylasim.length}</div>
            <div className="text-[10px] text-muted-foreground">Psikolog Paylaşımı</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-foreground">{paylasimlar.reduce((s, p) => s + p.likeSayisi, 0)}</div>
            <div className="text-[10px] text-muted-foreground">Toplam Beğeni</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={bekleyen.length > 0 ? "bekleyen" : "yayinda"}>
        <TabsList>
          {bekleyen.length > 0 && (
            <TabsTrigger value="bekleyen" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Bekleyen
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">{bekleyen.length}</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="yayinda" className="gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Yayında ({onayli.length})
          </TabsTrigger>
          <TabsTrigger value="psikolog" className="gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Psikolog ({psikologPaylasim.length})
          </TabsTrigger>
        </TabsList>

        {/* Bekleyen */}
        {bekleyen.length > 0 && (
          <TabsContent value="bekleyen">
            <Card className="border-amber-200/50">
              <CardContent className="pt-4">
                <div className="divide-y divide-border/40">
                  {bekleyen.map(p => (
                    <PaylasimRow key={p.id} p={p} onApprove={handleApprove} onDelete={handleDelete} onToggleBegeni={handleToggleBegeni} pending />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Yayında */}
        <TabsContent value="yayinda">
          <Card>
            <CardContent className="pt-4">
              {onayli.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="divide-y divide-border/40">
                  {onayli.map(p => (
                    <PaylasimRow key={p.id} p={p} onApprove={handleApprove} onDelete={handleDelete} onToggleBegeni={handleToggleBegeni} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Psikolog */}
        <TabsContent value="psikolog">
          <Card>
            <CardContent className="pt-4">
              {psikologPaylasim.length === 0 ? (
                <EmptyState message="Henüz psikolog paylaşımı yok." />
              ) : (
                <div className="divide-y divide-border/40">
                  {psikologPaylasim.map(p => (
                    <PaylasimRow key={p.id} p={p} onApprove={handleApprove} onDelete={handleDelete} onToggleBegeni={handleToggleBegeni} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ message = "Henüz paylaşım yok." }: { message?: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
      <p className="text-sm">{message}</p>
      <p className="text-xs mt-1">Personel portalından paylaşımlar burada görünecek.</p>
    </div>
  )
}

function PaylasimRow({ p, onApprove, onDelete, onToggleBegeni, pending }: {
  p: Paylasim
  onApprove: (id: string) => void
  onDelete: (id: string) => void
  onToggleBegeni: (id: string, current: boolean) => void
  pending?: boolean
}) {
  const tarih = new Date(p.olusturmaTarihi).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })

  return (
    <div className="flex items-start gap-3 py-3 group">
      {/* Sol: Kitap ikonu */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
        p.kaynak === "psikolog" ? "bg-primary/10" : "bg-muted"
      }`}>
        {p.kaynak === "psikolog" ? (
          <Sparkles className="w-4 h-4 text-primary" />
        ) : (
          <Quote className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Orta: İçerik */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-foreground">{p.kitapAdi}</span>
          <span className="text-xs text-muted-foreground">— {p.yazar}</span>
          {p.kaynak === "psikolog" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">Psikolog</span>
          )}
          {p.psikologBegeni && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-amber-500" /> Seçki
            </span>
          )}
          {pending && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">Onay Bekliyor</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground italic leading-relaxed mt-1">&ldquo;{p.alinti}&rdquo;</p>
        {p.yorum && <p className="text-xs text-muted-foreground mt-1.5">{p.yorum}</p>}
        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" /> {p.anonim ? "Anonim" : p.adSoyad}
          </span>
          {!p.anonim && p.mudurluk && <span>· {p.mudurluk}</span>}
          <span>· {tarih}</span>
          <span className="flex items-center gap-0.5">
            <Heart className="w-3 h-3" /> {p.likeSayisi}
          </span>
        </div>
      </div>

      {/* Sağ: Aksiyonlar */}
      <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        {pending && (
          <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => onApprove(p.id)}>
            <Check className="w-3 h-3 mr-1" /> Onayla
          </Button>
        )}
        <Button size="sm" variant="outline"
          className={`h-7 text-xs ${p.psikologBegeni ? "text-amber-600 bg-amber-50 border-amber-200" : "hover:text-amber-600"}`}
          onClick={() => onToggleBegeni(p.id, p.psikologBegeni)}>
          <Star className={`w-3 h-3 ${p.psikologBegeni ? "fill-amber-500" : ""}`} />
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(p.id)}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
