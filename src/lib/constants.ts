import type { AnaTema, KurumsalTema, GenelDurum } from "@/types"

// Belediye ortalamaları (anket sonuçları)
export const BELEDIYE_ORTALAMALARI = {
  genelMemnuniyet: 90.8,
  isStresi: 69.1,
  kurumDestegi: 82.3,
  denge: 13.2,
  ruhSagligiRiski: 52.2,
  katilimOrani: 70.4,
} as const

// KSE-53 norm değerleri
export const KSE_NORM = {
  gsi: { mean: 0.87, sd: 0.58 },
  pst: { mean: 23.52, sd: 10.78 },
  psdi: { mean: 1.59, sd: 0.53 },
} as const

// Kademe renk sistemi
export const KADEME_RENK: Record<number, { text: string; bg: string; label: string }> = {
  1: { text: "#DC2626", bg: "#FEF2F2", label: "Acil" },
  2: { text: "#EA580C", bg: "#FFF7ED", label: "Yüksek" },
  3: { text: "#CA8A04", bg: "#FEFCE8", label: "Orta" },
  4: { text: "#2563EB", bg: "#EFF6FF", label: "Düşük" },
  5: { text: "#16A34A", bg: "#F0FDF4", label: "Sağlıklı" },
}

// BFI kademe renkleri
export const BFI_KADEME_RENK: Record<string, { text: string; bg: string; label: string }> = {
  A: { text: "#DC2626", bg: "#FEF2F2", label: "Klinik" },
  B: { text: "#CA8A04", bg: "#FEFCE8", label: "İzleme" },
  C: { text: "#16A34A", bg: "#F0FDF4", label: "Normal" },
}

// Genel durum renkleri
export const DURUM_RENK: Record<string, { text: string; bg: string }> = {
  "Henüz Görülmedi": { text: "#78716C", bg: "#F5F0EB" },
  "Süreçte": { text: "#2563EB", bg: "#EFF6FF" },
  "Tamamlandı": { text: "#16A34A", bg: "#F0FDF4" },
  "Takipte": { text: "#CA8A04", bg: "#FEFCE8" },
}

// Genel durum seçenekleri
export const DURUM_OPTIONS: GenelDurum[] = [
  "Henüz Görülmedi",
  "Süreçte",
  "Tamamlandı",
  "Takipte",
] as const

// Ana tema seçenekleri
export const ANA_TEMALAR: AnaTema[] = [
  "Kaygı", "Depresyon", "Öfke", "Uyum Sorunu", "İlişki Sorunları",
  "Travma", "Bağımlılık", "Tükenmişlik", "Psikosomatik", "Kişilik",
  "İntihar Riski", "Yas/Kayıp",
]

// Kurumsal tema seçenekleri
export const KURUMSAL_TEMALAR: KurumsalTema[] = [
  "Yönetici Şikayeti", "Mobbing/Baskı", "Aşırı İş Yükü",
  "Ekip İçi Çatışma", "İletişim Sorunu", "Fiziksel Koşullar",
  "Adaletsizlik Algısı", "Kariyer Tıkanıklığı", "Vardiya/Mesai",
]

// Sidebar menü yapısı
export const SIDEBAR_MENU = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/danisanlar", label: "Danışanlar", icon: "Users", countKey: "danisanlar" as const },
  { href: "/testler", label: "Test Sonuçları", icon: "ClipboardCheck", countKey: "testSonuclari" as const },
  { href: "/planlar", label: "Seans Planları", icon: "FileText", countKey: "seansPlanlari" as const },
  { href: "/mudurlukler", label: "Müdürlükler", icon: "Building2", countKey: "mudurlukler" as const },
  { href: "/takvim", label: "Takvim", icon: "Calendar" },
] as const

// Metrik label ve açıklamaları
export const METRIK_INFO: Record<string, { label: string; yuksekIyi: boolean; unit: string }> = {
  genelMemnuniyet: { label: "Memnuniyet", yuksekIyi: true, unit: "%" },
  isStresi: { label: "İş Stresi", yuksekIyi: false, unit: "%" },
  kurumDestegi: { label: "Kurum Desteği", yuksekIyi: true, unit: "%" },
  denge: { label: "Denge", yuksekIyi: true, unit: "" },
  ruhSagligiRiski: { label: "Ruh Sağlığı Riski", yuksekIyi: false, unit: "%" },
}

// 32 Müdürlük isimleri (30 anketli + 2 anketsiz)
export const MUDURLUK_ISIMLERI = [
  "Afet İşleri Müdürlüğü",
  "Akıllı Ulaşım Sistemleri Müdürlüğü",
  "Basın ve Yayın Müdürlüğü",
  "Bilgi İşlem Müdürlüğü",
  "Çevre Koruma ve Kontrol Müdürlüğü",
  "Destek Hizmetleri Müdürlüğü",
  "Emlak ve İstimlak Müdürlüğü",
  "Fen İşleri Müdürlüğü",
  "Gelirler Müdürlüğü",
  "Gençlik ve Spor Hizmetleri Müdürlüğü",
  "Halkla İlişkiler Müdürlüğü",
  "Hukuk İşleri Müdürlüğü",
  "İklim Değişikliği ve Sıfır Atık Müdürlüğü",
  "İmar ve Şehircilik Müdürlüğü",
  "İnovasyon ve Teknoloji Müdürlüğü",
  "İnsan Kaynakları ve Eğitim Müdürlüğü",
  "İşletme ve İştirakler Müdürlüğü",
  "Koordinasyon İşleri Müdürlüğü",
  "Kültür İşleri Müdürlüğü",
  "Mali Hizmetler Müdürlüğü",
  "Muhtarlık İşleri Müdürlüğü",
  "Özel Kalem Müdürlüğü",
  "Park ve Bahçeler Müdürlüğü",
  "Plan ve Proje Müdürlüğü",
  "Ruhsat ve Denetim Müdürlüğü",
  "Sosyal Destek Hizmetleri Müdürlüğü",
  "Strateji Geliştirme Müdürlüğü",
  "Temizlik İşleri Müdürlüğü",
  "Veteriner İşleri Müdürlüğü",
  "Yapı Kontrol Müdürlüğü",
  "Yazı İşleri Müdürlüğü",
  "Zabıta Müdürlüğü",
] as const
