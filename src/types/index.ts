// Kurumsal Psikoloji Birimi — Tüm TypeScript tipleri

export type PersonelTipi = "Memur" | "İşçi" | "Şirket Personeli"
export type Ogrenim = "İlkokul" | "Ortaokul" | "Lise" | "Ön Lisans" | "Lisans" | "Lisansüstü"
export type KseKademe = "1" | "2" | "3" | "4" | "5"
export type BfiKademe = "A" | "B" | "C"
export type GenelDurum = "Henüz Görülmedi" | "Süreçte" | "Tamamlandı" | "Takipte"
export type TestTuru = "KSE-53" | "BFI-2" | "Birleşik"
export type PlanKaynak = "Test-bazlı" | "Klinik" | "Revize"
export type PlanDurumu = "Aktif" | "Revize Edildi" | "Tamamlandı"
export type GorusmeTuru = "İlk Görüşme" | "Takip" | "Kriz" | "Test Geri Bildirimi"
export type RiskDegisimi = "Arttı" | "Aynı" | "Azaldı"
export type SonrakiAdim = "Takip Planla" | "Psikiyatri Yönlendir" | "Tekrar Test" | "Sonlandır" | "Acil"
export type RiskSeviyesi = "Yüksek" | "Orta" | "Düşük"

export type AnaTema =
  | "Kaygı"
  | "Depresyon"
  | "Öfke"
  | "Uyum Sorunu"
  | "İlişki Sorunları"
  | "Travma"
  | "Bağımlılık"
  | "Tükenmişlik"
  | "Psikosomatik"
  | "Kişilik"
  | "İntihar Riski"
  | "Yas/Kayıp"

export type KurumsalTema =
  | "Yönetici Şikayeti"
  | "Mobbing/Baskı"
  | "Aşırı İş Yükü"
  | "Ekip İçi Çatışma"
  | "İletişim Sorunu"
  | "Fiziksel Koşullar"
  | "Adaletsizlik Algısı"
  | "Kariyer Tıkanıklığı"
  | "Vardiya/Mesai"

export interface Danisan {
  id: string
  sicilNo: number
  adSoyad: string
  mudurlukId: string
  gorevUnvani: string
  personelTipi: PersonelTipi
  cinsiyet: string
  yas: number
  medeniDurum: string
  ogrenim: Ogrenim
  okul: string
  bolum: string
  kidemGiris: string
  telefon: string
  fotograf: string | null
  triyajKademesi: number | null
  gsiSkoru: number | null
  kseKademe: KseKademe | null
  bfiKademe: BfiKademe | null
  genelDurum: GenelDurum
  sonGorusme: string | null
  sonrakiRandevu: string | null
  anketTamamlandi: boolean
  testTamamlandi: boolean
  gorusmeYapildi: boolean
  klinikOzet: string
  notlar: string
  referansKodu: string | null
}

export interface Mudurluk {
  id: string
  mudurlukAdi: string
  personelSayisi: number
  genelMemnuniyet: number | null
  isStresi: number | null
  kurumDestegi: number | null
  denge: number | null
  ruhSagligiRiski: number | null
  katilimOrani: number | null
  riskSeviyesi: RiskSeviyesi | null
  gorusulenPersonel: number
  sonRaporTarihi: string | null
  anketRaporuHtml: string | null
  kurumselKlinikRapor: string | null
}

export interface TestSonucu {
  id: string
  danisanId: string
  testTuru: TestTuru
  uygulamaTarihi: string
  kademe: string | null
  gsi: number | null
  pst: number | null
  psdi: number | null
  somatizasyon: number | null
  obsesifKompulsif: number | null
  kisilerarasiDuyarlilik: number | null
  depresyon: number | null
  anksiyete: number | null
  hostilite: number | null
  fobikAnksiyete: number | null
  paranoidDusunce: number | null
  psikotisizm: number | null
  disadonukluk: number | null
  yumusakBaslilik: number | null
  sorumluluk: number | null
  olumsuzDuygu: number | null
  acikFikirlilik: number | null
  raporIcerigi: string
  pdfUrl: string | null
}

export type PlanIlerleme = "Başlamadı" | "Devam Ediyor" | "Hedefe Ulaştı"

export interface SeansPlan {
  id: string
  danisanId: string
  olusturmaTarihi: string
  kaynak: PlanKaynak
  planDurumu: PlanDurumu
  planIcerigi: string
  pdfUrl: string | null
  hedefler?: string[]
  mudahaleler?: string[]
  sureTahminiHafta?: number | null
  ilerleme?: PlanIlerleme
}

export interface GorusmeNotu {
  id: string
  danisanId: string
  tarih: string
  sureDk: number
  gorusmeNo: number
  tur: GorusmeTuru
  anaTema: string[]
  kurumsalTema: string[]
  riskDegisimi: RiskDegisimi
  sonrakiAdim: SonrakiAdim
  kisaNot: string
  serbestNot: string
  anamnezNot: string
  formulasyonGuncelleme: string
  sonrakiSeansPlan: string
  transkriptUrl?: string
  insightUrl?: string
}

export type RandevuTalebiDurum = "Bekliyor" | "Onaylandı" | "Reddedildi"

export interface RandevuTalebi {
  id: string
  adSoyad: string
  telefon: string
  mudurluk: string
  gorusmeTuru: "İlk Görüşme" | "Takip" | "Kriz"
  not: string
  istenenTarih: string
  istenenSaat: string
  olusturmaTarihi: string
  durum: RandevuTalebiDurum
  kaynak: "online"
  referansKodu?: string
}

export interface Musaitlik {
  id: string
  gun: number
  baslangic: string
  bitis: string
  slotDk: number
  aktif: boolean
  kapaliSlotlar: string[]
}

export type SevkSonuc = "Bekliyor" | "Görüşme Yapıldı" | "İlaç Başlandı" | "Hastaneye Yatış" | "Red" | "Tamamlandı"

export interface Sevk {
  id: string
  danisanId: string
  sevkTarihi: string
  sevkYeri: string
  sevkNedeni: string
  sonuc: SevkSonuc
  donusTarihi: string | null
  notlar: string
}

export type MesajKategori =
  | "Görüşme Hakkında Soru"
  | "Öneri / Geri Bildirim"
  | "Şikayet"
  | "Genel Soru"
  | "Acil Destek Talebi"

export interface Mesaj {
  id: string
  anonim: boolean
  adSoyad: string | null
  mudurluk: string | null
  email: string | null
  kategori: MesajKategori
  mesaj: string
  okundu: boolean
  olusturmaTarihi: string
  cevap: string | null
  cevapTarihi: string | null
}

export type CollectionName =
  | "danisanlar"
  | "mudurlukler"
  | "testSonuclari"
  | "seansPlanlari"
  | "gorusmeNotlari"
  | "randevuTalepleri"
  | "musaitlik"
  | "sevkler"
  | "mesajlar"

export type CollectionType = {
  danisanlar: Danisan
  mudurlukler: Mudurluk
  testSonuclari: TestSonucu
  seansPlanlari: SeansPlan
  gorusmeNotlari: GorusmeNotu
  randevuTalepleri: RandevuTalebi
  musaitlik: Musaitlik
  sevkler: Sevk
  mesajlar: Mesaj
}
