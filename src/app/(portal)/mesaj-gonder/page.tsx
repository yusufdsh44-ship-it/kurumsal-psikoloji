"use client"

import { useState } from "react"
import { MessageSquareText, Send, ShieldCheck, User, EyeOff, CheckCircle, AlertTriangle } from "lucide-react"

const KATEGORILER = [
  "Görüşme Hakkında Soru",
  "Öneri / Geri Bildirim",
  "Şikayet",
  "Genel Soru",
  "Acil Destek Talebi",
] as const

const MUDURLUKLER = [
  "Afet İşleri Müdürlüğü", "Akıllı Ulaşım Sistemleri Müdürlüğü", "Basın ve Yayın Müdürlüğü",
  "Destek Hizmetleri Müdürlüğü", "Emlak ve İstimlak Müdürlüğü", "Fen İşleri Müdürlüğü",
  "Gelirler Müdürlüğü", "Gençlik ve Spor Hizmetleri Müdürlüğü", "Halkla İlişkiler Müdürlüğü",
  "Hukuk İşleri Müdürlüğü", "İklim Değişikliği ve Sıfır Atık Müdürlüğü",
  "İmar ve Şehircilik Müdürlüğü", "İnovasyon ve Teknoloji Müdürlüğü",
  "İnsan Kaynakları ve Eğitim Müdürlüğü", "İşletme ve İştirakler Müdürlüğü",
  "Koordinasyon İşleri Müdürlüğü", "Kültür İşleri Müdürlüğü", "Mali Hizmetler Müdürlüğü",
  "Muhtarlık İşleri Müdürlüğü", "Özel Kalem Müdürlüğü", "Park ve Bahçeler Müdürlüğü",
  "Plan ve Proje Müdürlüğü", "Ruhsat ve Denetim Müdürlüğü", "Sosyal Destek Hizmetleri Müdürlüğü",
  "Strateji Geliştirme Müdürlüğü", "Temizlik İşleri Müdürlüğü", "Veteriner İşleri Müdürlüğü",
  "Yapı Kontrol Müdürlüğü", "Yazı İşleri Müdürlüğü", "Zabıta Müdürlüğü",
]

export default function MesajGonderPage() {
  const [anonim, setAnonim] = useState(true)
  const [adSoyad, setAdSoyad] = useState("")
  const [mudurluk, setMudurluk] = useState("")
  const [email, setEmail] = useState("")
  const [kategori, setKategori] = useState<string>("")
  const [mesaj, setMesaj] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = mesaj.trim().length > 0 && kategori && (!anonim ? adSoyad.trim() && mudurluk : true)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSending(true)
    setError(null)

    try {
      const res = await fetch("/api/public/mesaj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonim,
          adSoyad: anonim ? null : adSoyad.trim(),
          mudurluk: anonim ? null : mudurluk,
          email: email.trim() || null,
          kategori,
          mesaj: mesaj.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gönderim başarısız")
      }

      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Beklenmeyen bir hata oluştu")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Mesajınız İletildi</h1>
        <p className="text-muted-foreground mb-6">
          Kurum psikologumuz en kısa sürede değerlendirecektir.
          {email && " Cevap e-posta adresinize gönderilecektir."}
        </p>
        <button
          onClick={() => { setSent(false); setMesaj(""); setKategori(""); setEmail(""); setAdSoyad(""); setMudurluk("") }}
          className="text-sm text-primary hover:underline"
        >
          Yeni mesaj gönder
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <MessageSquareText className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Kurum Psikologuna Mesaj</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Sorularınızı, önerilerinizi veya görüşlerinizi iletebilirsiniz.
          Kurum psikologumuz tarafından değerlendirilecektir.
        </p>
      </div>

      {/* Anonim / Kimlikli toggle */}
      <div className="flex rounded-xl border border-border overflow-hidden mb-6">
        <button
          onClick={() => setAnonim(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            anonim ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <EyeOff className="w-4 h-4" />
          Anonim
        </button>
        <button
          onClick={() => setAnonim(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            !anonim ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <User className="w-4 h-4" />
          Kimlikli
        </button>
      </div>

      {/* Kimlikli alanlar */}
      {!anonim && (
        <div className="space-y-3 mb-6 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Ad Soyad *</label>
            <input
              type="text"
              value={adSoyad}
              onChange={e => setAdSoyad(e.target.value)}
              placeholder="Adınız Soyadınız"
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Müdürlük *</label>
            <select
              value={mudurluk}
              onChange={e => setMudurluk(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            >
              <option value="">Müdürlük seçin...</option>
              {MUDURLUKLER.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* E-posta */}
      <div className="mb-6">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          E-posta {anonim ? "(opsiyonel — cevap almak isterseniz)" : "*"}
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="ornek@belediye.gov.tr"
          className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>

      {/* Kategori */}
      <div className="mb-6">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Konu</label>
        <div className="flex flex-wrap gap-2">
          {KATEGORILER.map(k => (
            <button
              key={k}
              onClick={() => setKategori(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                kategori === k
                  ? k === "Acil Destek Talebi"
                    ? "bg-red-50 text-red-700 border-red-300"
                    : "bg-primary/10 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              {k === "Acil Destek Talebi" && <AlertTriangle className="w-3 h-3 inline mr-1" />}
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Mesaj */}
      <div className="mb-6">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Mesajınız *</label>
        <textarea
          value={mesaj}
          onChange={e => setMesaj(e.target.value)}
          placeholder="Mesajınızı buraya yazın..."
          rows={6}
          maxLength={5000}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all resize-none placeholder:text-muted-foreground/40"
        />
        <div className="text-right mt-1">
          <span className="text-[10px] text-muted-foreground/40">{mesaj.length}/5000</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || sending}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <Send className="w-4 h-4" />
        {sending ? "Gönderiliyor..." : "Gönder"}
      </button>

      {/* Güvence */}
      {anonim && (
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground/60">
          <ShieldCheck className="w-4 h-4" />
          <span className="uppercase tracking-wider font-medium">Kimliğiniz asla kaydedilmez</span>
        </div>
      )}
    </div>
  )
}
