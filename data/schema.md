# Kurumsal Psikoloji Birimi — Veri Şeması ve Klinik Referans

Bu doküman, web uygulamasındaki tüm verilerin formatını, klinik çerçevelerini ve rapor yapılarını tanımlar.
Harici araç (Claude Cowork) bu dosyayı okuyarak veri girişi, analiz ve rapor üretimi yapar.

Uzm. Kl. Psk. Yusuf Pamuk · Arnavutköy Belediyesi · 2.240 personel · 31 müdürlük

---

## 1. Dosya Yapısı

```
data/
├── schema.md                ← BU DOSYA
├── danisanlar.json          ← 2.240 personel (array)
├── mudurlukler.json         ← 31 müdürlük + anket metrikleri (array)
├── testSonuclari.json       ← Test kayıtları (array)
├── seansPlanlari.json       ← Seans planları (array)
├── gorusmeNotlari.json      ← Görüşme notları (array)
├── pdf/                     ← Test rapor PDF'leri
│   ├── BFI2_3_MustafaC.pdf
│   ├── KSE53_3_MustafaC.pdf
│   ├── Birlesik_3_MustafaC.pdf
│   └── SeansPlan_3_MustafaC.pdf
└── raporlar/                ← Müdürlük raporları (Markdown)
    └── veteriner-isleri.md
```

---

## 2. Veri Modelleri

### 2.1. danisanlar.json (~2.240 kayıt)

```json
{
  "id": "uuid-v4",
  "sicilNo": 3,
  "adSoyad": "Mustafa C.",
  "mudurlukId": "uuid → mudurlukler[].id",
  "gorevUnvani": "Belediye Başkanı",
  "personelTipi": "Memur",
  "cinsiyet": "Erkek",
  "yas": 52,
  "medeniDurum": "Evli",
  "ogrenim": "Lisansüstü",
  "okul": "Marmara Üniversitesi Sosyal Bilimler Enstitüsü",
  "bolum": "İktisat",
  "kidemGiris": "2019-06-01",
  "telefon": "(532) 417 60 29",
  "fotograf": null,
  "triyajKademesi": 5,
  "gsiSkoru": 0.26,
  "kseKademe": "5",
  "bfiKademe": "A",
  "genelDurum": "Tamamlandı",
  "sonGorusme": "2026-03-24",
  "sonrakiRandevu": null,
  "anketTamamlandi": true,
  "testTamamlandi": true,
  "gorusmeYapildi": true,
  "klinikOzet": "İdeal benlik sunumu belirgin. GSI=0.26. Kaygı faceti 3.50. Yüksek işlevli anksiyete. Güven çelişkisi. Tükenmişlik kırılganlığı.",
  "notlar": ""
}
```

**Enum'lar:**
- personelTipi: "Memur" | "İşçi" | "Şirket Personeli"
- ogrenim: "İlkokul" | "Ortaokul" | "Lise" | "Ön Lisans" | "Lisans" | "Lisansüstü"
- kseKademe: "1" | "2" | "3" | "4" | "5" | null
- bfiKademe: "A" | "B" | "C" | null
- genelDurum: "Henüz Görülmedi" | "Süreçte" | "Tamamlandı" | "Takipte"

**Kurallar:**
- adSoyad: Soyadı kısalt. "YAVUZ FIRAT" → "Yavuz F."
- okul/bolum: En yüksek eğitim derecesinden al (Y.Lisans > Lisans > Önlisans)
- klinikOzet: Markdown. Her görüşme sonrası güncellenir.

### 2.2. mudurlukler.json (31 kayıt)

```json
{
  "id": "uuid-v4",
  "mudurlukAdi": "Afet İşleri Müdürlüğü",
  "personelSayisi": 13,
  "genelMemnuniyet": 90.9,
  "isStresi": 52.3,
  "kurumDestegi": 86.6,
  "denge": 34.3,
  "ruhSagligiRiski": 46.6,
  "katilimOrani": 100.0,
  "riskSeviyesi": "Düşük",
  "gorusulenPersonel": 0,
  "sonRaporTarihi": null,
  "anketRaporuHtml": "afet_isleri.html",
  "kurumselKlinikRapor": null
}
```

**Metrik açıklamaları:**
- genelMemnuniyet (0-100): "Bu kurumda çalışmaktan genel olarak memnunum" skoru
- isStresi (0-100): İş yoğunluğu, zaman baskısı, duygusal yük. **YÜKSEK = KÖTÜ**
- kurumDestegi (0-100): Yönetici, arkadaş, koşullar, eğitim desteği. **YÜKSEK = İYİ**
- denge: kurumDestegi − isStresi. **Negatif = tehlike**
- ruhSagligiRiski (0-100): Keyif alamama, çökkünlük, kaygı, endişe kontrolü. **YÜKSEK = KÖTÜ**
- riskSeviyesi: "Yüksek" (denge<0) | "Orta" (0-10) | "Düşük" (>10)

**Belediye ortalamaları:**
Memnuniyet %90.8 · Stres %69.1 · Destek %82.3 · Denge +13.2 · Ruh Sağlığı %52.2 · Katılım %70.4

**Negatif denge birimleri:** Veteriner -3.5 · Gelirler -2.5 · İmar -2.3

### 2.3. testSonuclari.json

```json
{
  "id": "uuid-v4",
  "danisanId": "uuid → danisanlar[].id",
  "testTuru": "KSE-53",
  "uygulamaTarihi": "2026-03-20",
  "kademe": "5",
  "gsi": 0.26, "pst": 14, "psdi": 1.00,
  "somatizasyon": 0.00, "obsesifKompulsif": 0.50,
  "kisilerarasiDuyarlilik": 0.25, "depresyon": 0.00,
  "anksiyete": 0.17, "hostilite": 0.40,
  "fobikAnksiyete": 0.20, "paranoidDusunce": 0.60,
  "psikotisizm": 0.40,
  "disadonukluk": null, "yumusakBaslilik": null,
  "sorumluluk": null, "olumsuzDuygu": null,
  "acikFikirlilik": null,
  "raporIcerigi": "Markdown klinik yorum",
  "pdfUrl": "data/pdf/KSE53_3_MustafaC.pdf"
}
```

testTuru'ne göre: "KSE-53" → KSE alanları dolu, BFI null. "BFI-2" → BFI dolu, KSE null. "Birleşik" → ikisi de dolu.

### 2.4. seansPlanlari.json

```json
{
  "id": "uuid-v4",
  "danisanId": "uuid → danisanlar[].id",
  "olusturmaTarihi": "2026-03-20",
  "kaynak": "Test-bazlı",
  "planDurumu": "Aktif",
  "planIcerigi": "Markdown — Bölüm A yol haritası + Bölüm B transkript",
  "pdfUrl": "data/pdf/SeansPlan_3_MustafaC.pdf"
}
```

kaynak: "Test-bazlı" | "Klinik" | "Revize" · planDurumu: "Aktif" | "Revize Edildi" | "Tamamlandı"

### 2.5. gorusmeNotlari.json

```json
{
  "id": "uuid-v4",
  "danisanId": "uuid → danisanlar[].id",
  "tarih": "2026-03-24T09:30:00",
  "sureDk": 25,
  "gorusmeNo": 1,
  "tur": "Test Geri Bildirimi",
  "anaTema": ["Kaygı"],
  "kurumsalTema": [],
  "riskDegisimi": "Aynı",
  "sonrakiAdim": "Sonlandır",
  "kisaNot": "Çift katmanlı seans. Başkan kaygıyı kabul etti.",
  "serbestNot": "Markdown uzun not",
  "formulasyonGuncelleme": "",
  "sonrakiSeansPlan": ""
}
```

**Enum'lar:**
- tur: "İlk Görüşme" | "Takip" | "Kriz" | "Test Geri Bildirimi"
- riskDegisimi: "Arttı" | "Aynı" | "Azaldı"
- sonrakiAdim: "Takip Planla" | "Psikiyatri Yönlendir" | "Tekrar Test" | "Sonlandır" | "Acil"

**Kurumsal tema seçenekleri:**
Yönetici Şikayeti · Mobbing/Baskı · Aşırı İş Yükü · Ekip İçi Çatışma · İletişim Sorunu · Fiziksel Koşullar · Adaletsizlik Algısı · Kariyer Tıkanıklığı · Vardiya/Mesai

---

## 3. Klinik Çerçeveler

### 3.1. KSE-53 (Kısa Semptom Envanteri)

53 madde, 0-4 Likert. Son 1 haftadaki psikolojik sıkıntı.

**9 Boyut:** Somatizasyon, Obsesif-Kompulsif, Kişilerarası Duyarlılık, Depresyon, Anksiyete, Hostilite, Fobik Anksiyete, Paranoid Düşünce, Psikotisizm (tümü 0-4 ölçek)

**3 Global İndeks:**
- GSI (gsi): Toplam/53. Norm 0.87±0.58. **Ana gösterge.**
- PST (pst): Sıfırdan büyük madde sayısı. Norm 23.52±10.78
- PSDI (psdi): Toplam/PST. Norm 1.59±0.53

**Klinik eşikler:** <1.0 normal · 1.0-2.0 klinik · >2.0 belirgin klinik

**Kritik maddeler (kademe 1 tetikler):** m40 ölüm düşüncesi ≥3 · m35 cezalandırılma ≥3 · m14 halüsinasyon ≥2

**KSE-53 Kademe Sistemi:**

| Kademe | GSI | Anlam | Renk |
|--------|-----|-------|------|
| 1 | ≥2.5 veya kritik madde | Acil müdahale | #DC2626 |
| 2 | 1.5–2.49 | Yüksek öncelik | #EA580C |
| 3 | 1.0–1.49 | Orta öncelik | #CA8A04 |
| 4 | 0.5–0.99 | Düşük risk | #2563EB |
| 5 | <0.5 | Takip gerektirmez | #16A34A |

**Rapor yapısı (gerçek PDF'den):**
Kademe badge → Klinik Özet (callout) → Boyut Profili (bar grafik 0-4, kesikli çizgiler 1.0 ve 2.0) → Global İndeksler (3 büyük kart) → Klinik Yorum → Öneriler

**Gerçek rapor yorumlama örnekleri:**
- "Paranoid Düşünce 0.60: güvenememe (m10=1), gözlenme (m24=1), sömürülme (m52=1) hafif — kurumsal temkinlilik"
- "Ardışık 13 sıfır yanıt (m11-m23): depresif maddelerin toptan reddi olasılığı"
- "m40 ölüm düşüncesi=1: Türk-Müslüman bağlamda normatif varoluşsal meşguliyet"
- "PST=14, PSDI=1.00: hiçbir madde 2+ onaylanmamış — düşük PST + düşük PSDI = dürüstlük veya savunma"

### 3.2. BFI-2 (Beş Faktör Kişilik Envanteri)

60 madde, 1-5 Likert. Soto & John 2017.

**5 Faktör:** Dışadönüklük (1-5), Yumuşak Başlılık (1-5), Sorumluluk (1-5), Olumsuz Duygu (1-5), Açık Fikirlilik (1-5)

**15 Facet:**
- Dışadönüklük: Girişkenlik, Sosyallik, Enerji Düzeyi
- Yumuşak Başlılık: Şefkat, Saygılılık, Güven
- Sorumluluk: Düzenlilik, Üretkenlik, Sorumluluk (facet)
- Olumsuz Duygu: Kaygı, Depresyon (facet), Duygusal Değişkenlik
- Açık Fikirlilik: Yaratıcı Hayal Gücü, Entelektüel Merak, Estetik Duyarlılık

**BFI-2 Kademe:**
- A: ≥3 boyut normun 1SS üstünde VEYA ≥3 facet tavanda (5.00) VEYA arzu edilirlik bileşkesi ≥4.50 → Klinik değerlendirme
- B: Olumsuz Duygu normun 1SS üstünde VEYA facet tutarsızlıkları → İzleme
- C: Normal profil

**İdeal benlik süzgeci (gerçek rapordan):**
- Arzu edilirlik bileşkesi = (YumuşakBaşlılık + Sorumluluk + Dışadönüklük) / 3
- Formel eşik ≥ 4.50
- "Profil geçersiz değildir ancak ideal benlik süzgecinden geçmiş olma olasılığı yüksektir — yüz değerinde alınmamalıdır"
- Sızıntı noktaları: Kaygı faceti (bastırılması en zor), ters madde sızıntıları (m8 tembellik), testler arası mikro-çelişkiler

**Rapor yapısı (gerçek PDF'den):**
Kademe A/B/C badge → Yanıt Geçerliliği (ideal benlik analizi callout) → Klinik Özet → Boyut Profili (bar grafik 1-5, gri bant=norm ±1SS) → Dikkat Çekici Facetler (kırmızı çubuklu liste) → Klinik Yorum → Öneriler

**Gerçek rapor yorumlama örnekleri:**
- "Kaygı 3.50 — yüksek işlevli anksiyete: kaygı yaşıyor ama performansa dönüştürebiliyor"
- "Depresyon faceti 1.50 — enerjik yapı, depresif yaşantıdan uzak"
- "m8 tembelliğe eğilimli=4 — ideal sunum filtrelerinin atlayabildiği nadir otantik kabul (leakage)"
- "Kişilik örgütlenmesi: nevrotik düzey, yüksek ego gücü"
- "Young şema: koşulsuz kabul şemasının sağlıklı kutbu"

### 3.3. Birleşik Değerlendirme (KSE-53 + BFI-2)

**Rapor yapısı (gerçek PDF'den):**
Çift badge → Yanıt Geçerliliği (testler arası z farkı) → Klinik Özet → Profil Karşılaştırması (yan yana bar grafikler + öne çıkan facetler) → Birleşik Klinik Yorum:
1. Durum mu yapı mı?
2. İdeal benlik süzgeci ve sızıntı analizi (sızıntı noktaları listesi)
3. Savunma mekanizmaları (idealizasyon, inkâr, entelektüelleştirme)
4. Kişilik semptomu besliyor mu? (yapısal kırılganlık: yüksek Sorumluluk + Girişkenlik + subklinik Kaygı = tükenmişlik riski)
5. Prognoz ve tedavi uyumu

**Testler arası tutarsızlık:** z farkı = |GSI z − Olumsuz Duygu z|. Normal <1.5.

### 3.4. Seans Planı (Gerçek PDF'den)

**Bölüm A — Yol Haritası:**
1. Profil Özeti
2. Seansın Mimarisi (Katman 1 Klinik + Katman 2 Vitrin)
3. Seans Stratejisi (pozisyonlanma, iletişim, tempo, savunma haritası)
4. Düzey 1: Doğrulayıcı (güven inşası)
5. Düzey 2: Genişletici (kaygı, sızıntılar, çelişkiler)
6. Düzey 3: Zorlayıcı (koşullu — ideal benlik, imaj yönetimi)
7. "Vay Be" Anı (çapraz doğrulama gösterimi)
8. Çalışma Alanları (kısa vade + uzun vade)
9. Kapanış Stratejisi (açık döngü/Zeigarnik + kurumsal)

**Bölüm B — Transkript:**
Dakika bazlı (0-3, 3-6, 6-10, 10-12, 12-18, 18-22, 22-27). Yeşil=söyle, mavi=sor, mor=vitrin, kırmızı=uyarı, sarı=dallanma. Her dallanmada if/else. Zorlayıcı Anlar Tepki Rehberi.

### 3.5. Birleşik Triyaj

Nihai kademe = en kötüsü: KSE-1 + BFI-C → Triyaj 1. KSE-5 + BFI-A → İdeal benlik değerlendir. Acil risk her zaman öncelikli.

---

## 4. Anket Yapısı (Gerçek HTML Rapordan)

45 soru · 1.470 yanıt · %70.4 katılım

**Temel göstergeler:** Katılım, Memnuniyet, İş Stresi, Kurum Desteği, Denge, Ruh Sağlığı Riski, Sigara

**10 Tema (belediye ortalamaları):**
İş-Kişi Uyumu %91.3 · Görev-Rol Netliği %86.6 · Yöneticilerle İlişkiler %86.8 · Çalışma Arkadaşları %86.9 · Kamu Hizmeti Motivasyonu %92.8 · Kurum İçi İletişim %79.8 · Yetkinlik & Performans %77.2 · Eğitim & Gelişim %75.8 · Çalışma Koşulları %72.2 · İş Stresi/Yükü %69.1

**HTML rapor bölümleri:**
1. Temel Göstergeler tablosu (müdürlük vs belediye ort. vs fark)
2. ✓ Güçlü Yönler
3. ⚠ Geliştirilmesi Gereken Alanlar
4. ◆ Dikkat Çeken Bulgular
5. Tema Bazlı Performans (10 tema)
6. Soru Bazlı Detaylı Bulgular
7. Açık Uçlu Yorumlar (doğrudan alıntılar)
8. Ruh Sağlığı Göstergeleri
9. Sosyal Medya Takip

---

## 5. Excel Eşleştirmesi

TÜM_PERSONEL_BİLGİ_RAPORU.xls · 2.240 satır · 20 sütun

| Excel | JSON | Dönüşüm |
|---|---|---|
| Sicil No (0) | sicilNo | Float→Int |
| Ad Soyad (1) | adSoyad | "YAVUZ FIRAT"→"Yavuz F." |
| Personel Tipi (2) | personelTipi | MEMUR→Memur |
| Görev Birimi (3) | mudurlukId | Müdürlük adından UUID eşleştir |
| Görev Ünvanı (5) | gorevUnvani | Olduğu gibi |
| Son Öğrenim (6) | ogrenim | LİSANSÜSTÜ→Lisansüstü |
| Önlisans Okul/Bölüm (7-8) | okul, bolum (3. öncelik) | Y.Lisans > Lisans > Önlisans |
| Lisans Okul/Bölüm (9-10) | okul, bolum (2. öncelik) | — |
| Y.Lisans Okul/Bölüm (11-12) | okul, bolum (1. öncelik) | — |
| Cinsiyet (13) | cinsiyet | ERKEK→Erkek |
| Belediye Giriş (14) | kidemGiris | 01.06.2019→2019-06-01 |
| Yaş (16) | yas | Float→Int |
| Cep Telefonu (18) | telefon | Olduğu gibi |
| Medeni Durumu (19) | medeniDurum | EVLİ→Evli |

Kullanılmayan: Kadro Ünvanı (4), Doğum Yeri (15), Adres İlçesi (17)

---

## 6. İlişkiler

```
danisanlar.mudurlukId     → mudurlukler.id
testSonuclari.danisanId   → danisanlar.id
seansPlanlari.danisanId   → danisanlar.id
gorusmeNotlari.danisanId  → danisanlar.id
```

**Müdürlük analizi için:** mudurlukler'den metrikler + danisanlar'dan o müdürlükteki personel + testSonuclari'ndan testler + gorusmeNotlari'ndan notlar ve kurumsal tema dağılımı

---

## 7. Dosya Adı Formatları

**PDF:** `[TestTuru]_[SicilNo]_[AdKisa].pdf` → BFI2_3_MustafaC.pdf, KSE53_3_MustafaC.pdf, Birlesik_3_MustafaC.pdf, SeansPlan_3_MustafaC.pdf

**Rapor:** Slug. "Veteriner İşleri Müdürlüğü" → veteriner-isleri.md

**Tarih:** ISO 8601. 2026-03-24 veya 2026-03-24T09:30:00 · **ID:** UUID v4

---

## 8. Müdürlük Başkan Raporu (data/raporlar/)

```markdown
# [Müdürlük] — Kurumsal Klinik Değerlendirme Raporu

**Uzm. Kl. Psk. Yusuf Pamuk** · Kurumsal Psikoloji Birimi · Arnavutköy Belediyesi
**Tarih:** [tarih] · **Kaynaklar:** Anket ([N]) + Testler ([N]) + Görüşmeler ([N])

## Yönetici Özeti
Risk: [düzey] · Denge: [değer] (bel +13.2) · GSI: [ort] (bel 0.87) · Ruh s.: %[değer] (bel %52.2) · Görüşülen: [N/N] · Sorun: [özet]

**Bulgu:** [Tek paragraf — 30 saniyede anlaşılmalı]

**Aksiyon:** 1. Acil: ... 2. Kısa vade (1-2ay): ... 3. İzleme (3ay): ...

## 1. Anket Bulguları
5 metrik + belediye karşılaştırması + 10 tema + açık uçlu alıntılar

## 2. Test Bulguları
GSI dağılımı + kademe tablosu + baskın boyutlar + belediye karşılaştırması

## 3. Görüşme Bulguları
Kurumsal tema dağılımı (yüzdeler) + somut gözlemler + duygusal notlar

## 4. Çapraz Doğrulama
3 kaynak tutarlılık analizi + bireysel mi kurumsal mı + JD-R formülasyonu

## 5. Risk ve Öneriler
Acil / Kısa vade / İzleme
```

**Ton:** Bilimsel, anlaşılır, kanıta dayalı. Belediye ortalamasıyla kıyasla. Yargılamadan. JD-R + Herzberg çerçevesi.

---

## 9. Cowork Örnek Komutlar

**Test girişi:** "schema.md oku. Ahmet K. (sicil:47, Veteriner) KSE-53: GSI=2.84, PST=48, PSDI=2.10, somatizasyon=1.85, obsesifKompulsif=2.33... Kademe 1. testSonuclari.json'a ekle, danisanlar.json güncelle."

**Rapor:** "schema.md oku. Veteriner İşleri raporunu üret: mudurlukler.json metrikleri + danisanlar.json personel + testSonuclari.json + gorusmeNotlari.json. Bölüm 8 formatında yaz → data/raporlar/veteriner-isleri.md"

**Sorgu:** "danisanlar.json'dan triyajKademesi 1-2 olanları listele: ad, müdürlük, GSI, kademe. Müdürlüğe göre grupla."

**Tema analizi:** "gorusmeNotlari.json'dan kurumsalTema dağılımını çıkar. Tema × müdürlük tablosu."
