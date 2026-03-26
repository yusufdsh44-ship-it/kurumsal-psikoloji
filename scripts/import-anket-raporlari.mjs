import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'

const ROOT = join(import.meta.dirname, '..')
const DATA = join(ROOT, 'data')

// --- nanoid-compatible ID generator (no dependency) ---
function nanoid(size = 21) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
  const bytes = randomBytes(size)
  let id = ''
  for (let i = 0; i < size; i++) id += alphabet[bytes[i] & 63]
  return id
}

// --- CSV parser (handles BOM, quoted fields) ---
function parseCSV(filepath) {
  let raw = readFileSync(filepath, 'utf-8')
  raw = raw.replace(/^\uFEFF/, '') // BOM
  const lines = raw.trim().split('\n')
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h.trim()] = values[i]?.trim() ?? '' })
    return obj
  })
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue }
    current += ch
  }
  result.push(current)
  return result
}

// --- Title Case for Turkish ---
function toTitleCase(str) {
  const smallWords = new Set(['ve', 'ile', 'için', 'veya'])
  return str.split(' ').map((word, i) => {
    const lower = word.toLocaleLowerCase('tr-TR')
    if (i > 0 && smallWords.has(lower)) return lower
    // Turkish İ/I handling
    if (lower.startsWith('i')) return 'İ' + lower.slice(1)
    if (lower.startsWith('ı')) return 'I' + lower.slice(1)
    return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1)
  }).join(' ')
}

// --- Extract department name from CSV row ---
function extractDeptName(csvName) {
  // "#101 - AFET İŞLERİ MÜDÜRLÜĞÜ" → "Afet İşleri Müdürlüğü"
  const match = csvName.match(/^#\d+ - (.+)$/)
  return match ? toTitleCase(match[1]) : toTitleCase(csvName)
}

// --- Map CSV department name to HTML filename ---
const CSV_TO_HTML = {
  'Afet İşleri Müdürlüğü': 'afet_isleri.html',
  'Akıllı Ulaşım Sistemleri Müdürlüğü': 'akilli_ulasim.html',
  'Basın ve Yayın Müdürlüğü': 'basin_yayin.html',
  'Destek Hizmetleri Müdürlüğü': 'destek_hizmetleri.html',
  'Emlak ve İstimlak Müdürlüğü': 'emlak_istimlak.html',
  'Fen İşleri Müdürlüğü': 'fen_isleri.html',
  'Gelirler Müdürlüğü': 'gelirler.html',
  'Gençlik ve Spor Hizmetleri Müdürlüğü': 'genclik_spor.html',
  'Halkla İlişkiler Müdürlüğü': 'halkla_iliskiler.html',
  'Hukuk İşleri Müdürlüğü': 'hukuk_isleri.html',
  'İklim Değişikliği ve Sıfır Atık Müdürlüğü': 'iklim_degisikligi.html',
  'İmar ve Şehircilik Müdürlüğü': 'imar_sehircilik.html',
  'İnovasyon ve Teknoloji Müdürlüğü': 'inovasyon.html',
  'İnsan Kaynakları ve Eğitim Müdürlüğü': 'insan_kaynaklari.html',
  'İşletme ve İştirakler Müdürlüğü': 'isletme_istirakler.html',
  'Koordinasyon İşleri Müdürlüğü': 'koordinasyon.html',
  'Kültür İşleri Müdürlüğü': 'kultur_isleri.html',
  'Mali Hizmetler Müdürlüğü': 'mali_hizmetler.html',
  'Muhtarlık İşleri Müdürlüğü': 'muhtarlik.html',
  'Özel Kalem Müdürlüğü': 'ozel_kalem.html',
  'Park ve Bahçeler Müdürlüğü': 'park_bahceler.html',
  'Plan ve Proje Müdürlüğü': 'plan_proje.html',
  'Ruhsat ve Denetim Müdürlüğü': 'ruhsat_denetim.html',
  'Sosyal Destek Hizmetleri Müdürlüğü': 'sosyal_destek.html',
  'Strateji Geliştirme Müdürlüğü': 'strateji_gelistirme.html',
  'Temizlik İşleri Müdürlüğü': 'temizlik_isleri.html',
  'Veteriner İşleri Müdürlüğü': 'veteriner_isleri.html',
  'Yazı İşleri Müdürlüğü': 'yazi_isleri.html',
  'Zabıta Müdürlüğü': 'zabita.html',
  'Yapı Kontrol Müdürlüğü': 'yapi_kontrol.html',
}

// --- Existing JSON ID mapping (preserve IDs for referential integrity) ---
// Includes Cowork-created IDs found via danisanlar references
const EXISTING_IDS = {
  'Afet İşleri Müdürlüğü': 'aUKAUSlesQ4kwpZJyJh6o',
  'Akıllı Ulaşım Sistemleri Müdürlüğü': 'EPhKVsprJ_NognDBaXhu5',
  'Basın ve Yayın Müdürlüğü': 'boXXpbUZwdHFUHiFReWPg',
  'Destek Hizmetleri Müdürlüğü': '6Ea3AzBfAWIh89C_INspf',
  'Emlak ve İstimlak Müdürlüğü': 'DQfU4X-T2xTZnEhzXj7eK',
  'Fen İşleri Müdürlüğü': 'suogn-XjhA08FQVvAJHdB',
  'Gelirler Müdürlüğü': '3e_-tJt5s1HwsZ0oBwYWZ',
  'Gençlik ve Spor Hizmetleri Müdürlüğü': 'yckriZQbP0ydcFJkZc4-f', // Cowork-created, 129 danışan
  'Hukuk İşleri Müdürlüğü': 't4hOrSL3vCUv66kafH0_A',
  'İmar ve Şehircilik Müdürlüğü': 'tXjHN-ZvIvu4mYvbIpv0w',
  'İnsan Kaynakları ve Eğitim Müdürlüğü': 'JCkdIfRT3p3zJAGKax6GT',
  'İşletme ve İştirakler Müdürlüğü': 'U8BVJRDZsKQAihXugLzL9',
  'Koordinasyon İşleri Müdürlüğü': 'TD_36N7du6P-97D70cx1U', // Cowork-created, 7 danışan
  'Kültür İşleri Müdürlüğü': 'kxXYIYAcUyXnCSpo-Fzsg',
  'Mali Hizmetler Müdürlüğü': 'fsWApJVv2ufl26u7l79Mk',
  'Muhtarlık İşleri Müdürlüğü': 'Vc1---E77yYjXFd1HQZCb',
  'Özel Kalem Müdürlüğü': '8rPfW7H-CIV_vMNeTkZcO',
  'Park ve Bahçeler Müdürlüğü': '3Jfbv7Rnoiash4FFRlHDk',
  'Plan ve Proje Müdürlüğü': 'xgGiJ60ldt8zgnZdIfjaK',
  'Ruhsat ve Denetim Müdürlüğü': 'Ldaqj4fGxeK4C1xrs07zD',
  'Sosyal Destek Hizmetleri Müdürlüğü': 'ugBn0pHx2F7bR_92sYfak',
  'Strateji Geliştirme Müdürlüğü': 'I1Hz-e-G3zm0wZjLLfBHO',
  'Temizlik İşleri Müdürlüğü': 'nMALtpNE9qgB5djwNKsG0',
  'Veteriner İşleri Müdürlüğü': 'UCKlXrKlu1tThK4XTf5xm',
  'Yapı Kontrol Müdürlüğü': '8xEroaWnkVxc6DquZkQoA',
  'Yazı İşleri Müdürlüğü': 'k_VYOO10TFsUWEDYxJdUF',
  'Zabıta Müdürlüğü': '9zxnDAxooMhd0jX0VG-1d',
}

// --- Departments with danisanlar but NOT in survey CSV (add with null metrics) ---
const NON_SURVEY_DEPTS = [
  { id: 'Gzy-szm7t085HpvQSBKnB', mudurlukAdi: 'Bilgi İşlem Müdürlüğü' },    // 42 danışan
  { id: 'zEJXWgo_ydRPZxm22KE8m', mudurlukAdi: 'Çevre Koruma ve Kontrol Müdürlüğü' }, // 25 danışan
]

// --- Risk level from denge ---
function getRiskSeviyesi(denge) {
  if (denge < 0) return 'Yüksek'
  if (denge <= 10) return 'Orta'
  return 'Düşük'
}

// --- Parse number, handle Turkish format and % sign ---
function parseNum(val) {
  if (!val || val === '-') return null
  const cleaned = val.replace(/%/g, '').replace(',', '.').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : Math.round(num * 10) / 10
}

// ====== MAIN ======
console.log('=== Anket Verileri Import Scripti ===\n')

// 1. Parse CSV files
const genelSkorlar = parseCSV(join(ROOT, '..', 'Downloads', 'Anket_ve_Raporlar', 'genel_skorlar_2025-11-17.csv'))
const ruhSagligi = parseCSV(join(ROOT, '..', 'Downloads', 'Anket_ve_Raporlar', 'ruh_sagligi_2025-11-17.csv'))

console.log(`CSV genel_skorlar: ${genelSkorlar.length} satır`)
console.log(`CSV ruh_sagligi: ${ruhSagligi.length} satır`)

// 2. Build ruh_sagligi lookup by department name
const ruhSagligiMap = {}
for (const row of ruhSagligi) {
  const name = extractDeptName(row['Müdürlükler'])
  ruhSagligiMap[name] = parseNum(row['Ruh Sağlığı Genel (%)'])
}

// 3. Load danisanlar for gorusulenPersonel count
const danisanlar = JSON.parse(readFileSync(join(DATA, 'danisanlar.json'), 'utf-8'))
const danisanCountByMudurluk = {}
for (const d of danisanlar) {
  danisanCountByMudurluk[d.mudurlukId] = (danisanCountByMudurluk[d.mudurlukId] || 0) + 1
}

// 4. Verify HTML files exist
const htmlFiles = new Set(readdirSync(join(DATA, 'anket-raporlari')).filter(f => f.endsWith('.html')))
console.log(`HTML dosya sayısı: ${htmlFiles.size}\n`)

// 5. Process each CSV row (skip "GENEL BELEDİYE")
const result = []
let created = 0, updated = 0, skipped = 0

for (const row of genelSkorlar) {
  const csvName = row['Müdürlükler']

  // Skip the general municipality row
  if (csvName === 'GENEL BELEDİYE') {
    console.log(`[SKIP] GENEL BELEDİYE (belediye ortalaması — sabitler için kullanılacak)`)
    console.log(`  genelMemnuniyet: ${row['Genel Memnuniyet (%)']}, isStresi: ${row['İş Yükü/Stresi (%)']}, kurumDestegi: ${row['Kurum Desteği (%)']}, denge: ${row['İş Yükü-Destek Dengesi']}`)
    skipped++
    continue
  }

  const titleName = extractDeptName(csvName)
  const htmlFile = CSV_TO_HTML[titleName]
  const existingId = EXISTING_IDS[titleName]

  // Parse metrics
  const personelSayisi = parseInt(row['Toplam Personel']) || 0
  const katilimOrani = parseNum(row['Katılım Oranı (%)'])
  const genelMemnuniyet = parseNum(row['Genel Memnuniyet (%)'])
  const isStresi = parseNum(row['İş Yükü/Stresi (%)'])
  const kurumDestegi = parseNum(row['Kurum Desteği (%)'])

  // denge: from CSV if available, otherwise calculate
  let denge = parseNum(row['İş Yükü-Destek Dengesi'])
  if (denge === null && kurumDestegi !== null && isStresi !== null) {
    denge = Math.round((kurumDestegi - isStresi) * 10) / 10
  }

  const ruhSagligiRiski = ruhSagligiMap[titleName] ?? null
  const riskSeviyesi = denge !== null ? getRiskSeviyesi(denge) : 'Düşük'

  const id = existingId || nanoid()
  const gorusulenPersonel = danisanCountByMudurluk[id] || 0

  // Verify HTML file exists
  if (htmlFile && !htmlFiles.has(htmlFile)) {
    console.log(`[WARN] HTML dosya bulunamadı: ${htmlFile} (${titleName})`)
  }

  const entry = {
    id,
    mudurlukAdi: titleName,
    personelSayisi,
    genelMemnuniyet,
    isStresi,
    kurumDestegi,
    denge,
    ruhSagligiRiski,
    katilimOrani,
    riskSeviyesi,
    gorusulenPersonel,
    sonRaporTarihi: null,
    anketRaporuHtml: htmlFile && htmlFiles.has(htmlFile) ? htmlFile : null,
    kurumselKlinikRapor: null,
  }

  result.push(entry)

  if (existingId) {
    console.log(`[UPDATE] ${titleName} (ID korundu: ${id.slice(0, 8)}...)`)
    updated++
  } else {
    console.log(`[CREATE] ${titleName} (yeni ID: ${id.slice(0, 8)}...)`)
    created++
  }
}

// 6. Add non-survey departments (real departments with danisanlar but not in survey)
for (const dept of NON_SURVEY_DEPTS) {
  const gorusulenPersonel = danisanCountByMudurluk[dept.id] || 0
  result.push({
    id: dept.id,
    mudurlukAdi: dept.mudurlukAdi,
    personelSayisi: 0, // unknown — not in survey
    genelMemnuniyet: null,
    isStresi: null,
    kurumDestegi: null,
    denge: null,
    ruhSagligiRiski: null,
    katilimOrani: null,
    riskSeviyesi: null,
    gorusulenPersonel,
    sonRaporTarihi: null,
    anketRaporuHtml: null,
    kurumselKlinikRapor: null,
  })
  console.log(`[NON-SURVEY] ${dept.mudurlukAdi} (${gorusulenPersonel} danışan, anket verisi yok)`)
}

// 7. Sort alphabetically by Turkish locale
result.sort((a, b) => a.mudurlukAdi.localeCompare(b.mudurlukAdi, 'tr-TR'))

// 8. Write result
writeFileSync(join(DATA, 'mudurlukler.json'), JSON.stringify(result, null, 2), 'utf-8')

console.log(`\n=== ÖZET ===`)
console.log(`Toplam: ${result.length} müdürlük (${result.filter(r => r.anketRaporuHtml).length} anketli + ${NON_SURVEY_DEPTS.length} anketsiz)`)
console.log(`Güncellenen: ${updated}`)
console.log(`Yeni oluşturulan: ${created}`)
console.log(`Anketsiz (danışan referanslı): ${NON_SURVEY_DEPTS.length}`)
console.log(`Atlanan: ${skipped} (GENEL BELEDİYE)`)
console.log(`Silinen demo: 4 (Sağlık İşleri, İtfaiye, Kentsel Tasarım, Kreş — danışan referansı yok)`)
console.log(`\n✓ data/mudurlukler.json güncellendi`)

// 8. Print BELEDIYE_ORTALAMALARI for constants.ts verification
const belOrt = genelSkorlar.find(r => r['Müdürlükler'] === 'GENEL BELEDİYE')
if (belOrt) {
  console.log(`\n--- BELEDIYE_ORTALAMALARI (constants.ts için) ---`)
  console.log(`genelMemnuniyet: ${belOrt['Genel Memnuniyet (%)']}`)
  console.log(`isStresi: ${belOrt['İş Yükü/Stresi (%)']}`)
  console.log(`kurumDestegi: ${belOrt['Kurum Desteği (%)']}`)
  console.log(`denge: ${belOrt['İş Yükü-Destek Dengesi']}`)
  console.log(`ruhSagligiRiski: (ruh_sagligi CSV'den alınmalı)`)
}
