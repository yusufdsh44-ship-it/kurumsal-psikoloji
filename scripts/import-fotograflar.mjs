import { readFileSync, writeFileSync, readdirSync, statSync, copyFileSync, mkdirSync, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const ROOT = join(import.meta.dirname, '..')
const DATA = join(ROOT, 'data')
const FOTOS_DIR = join(DATA, 'fotos')
const SRC_BASE = '/Users/yusufpamuk/Desktop/Raporlar ve Belgeler/LAZIM OLAN PERSONEL BİLGİLERİ'
const XLS_PATH = join(SRC_BASE, 'TÜM PERSONEL BİLGİ RAPORU.xls')

const SOURCES = [
  { dir: join(SRC_BASE, 'İŞÇİ PERSONEL FOTOĞRAFLARI'), tipiHint: 'İşçi' },
  { dir: join(SRC_BASE, 'MEMUR PERSONEL FOTOĞRAFLARI'), tipiHint: 'Memur' },
  { dir: join(SRC_BASE, 'PERAŞ FOTOĞRAFLAR'), tipiHint: 'Şirket Personeli' },
]

const SKIP_PATTERNS = ['ayrılanlar', 'ayrilanlar', 'işten çıkan', 'isten cikan']
const VALID_EXT = new Set(['.jpg', '.jpeg', '.png', '.jfif'])

// --- Turkish normalization (NFC to fix macOS NFD filenames) ---
function normalizeTR(str) {
  return str
    .normalize('NFC')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim()
}

// --- Known müdürlük keywords to strip from filenames ---
const MUDURLUK_WORDS = [
  'müdürlüğü', 'müdürlügü', 'müdürlük', 'mudurlugu', 'müdür',
  'destek hizmetleri', 'strateji geliştirme', 'fen işleri',
  'gelirler', 'temizlik', 'zabıta', 'veteriner', 'park bahçeler',
  'imar', 'plan proje', 'ruhsat', 'sosyal', 'hukuk', 'yazı işleri',
  'muhtarlık', 'koordinasyon', 'kültür', 'inovasyon', 'akıllı ulaşım',
  'afet işleri', 'basin yayin', 'halkla ilişkiler', 'emlak', 'gençlik',
  'iklim', 'mali', 'özel kalem', 'insan kaynakları', 'işletme',
]

// --- Extract clean name candidates from photo filename ---
function extractNameCandidates(filename) {
  let name = basename(filename, extname(filename))

  // Remove common noise
  name = name
    .replace(/\s*\(\d+\)\s*/g, '')   // (1), (2)
    .replace(/\d{8,}/g, '')           // timestamps
    .replace(/\s+\d+\s*$/g, '')       // trailing " 2"
    .replace(/\d+\s*$/g, '')          // trailing digits
    .replace(/\.+\s*$/g, '')          // trailing dots

  name = name.trim()
  if (!name || name.length < 3) return []

  const normalized = normalizeTR(name)
  const parts = normalized.split(' ').filter(p => p.length > 0)
  if (parts.length < 2) return []

  // Generate candidates: progressively strip trailing words
  // "ali sadi yılmaz strateji müdürlüğü" → try all from full to 2-word
  const candidates = []
  for (let len = parts.length; len >= 2; len--) {
    candidates.push(parts.slice(0, len).join(' '))
  }
  return candidates
}

// --- Recursive scan photo directories ---
function scanDir(dir, tipiHint, photos) {
  let entries
  try { entries = readdirSync(dir) } catch { return }

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    let stat
    try { stat = statSync(fullPath) } catch { continue }

    if (stat.isDirectory()) {
      const lowerEntry = normalizeTR(entry)
      if (SKIP_PATTERNS.some(p => lowerEntry.includes(p))) continue
      scanDir(fullPath, tipiHint, photos)
      continue
    }

    const ext = extname(entry).toLowerCase()
    if (!VALID_EXT.has(ext)) continue
    if (entry === 'Thumbs.db' || entry.startsWith('.')) continue

    const candidates = extractNameCandidates(entry)
    if (candidates.length === 0) continue

    photos.push({ path: fullPath, candidates, tipiHint, originalName: entry })
  }
}

// ====== MAIN ======
console.log('=== Fotoğraf Import v2 (XLS tam isim eşleştirme) ===\n')

// 1. Read XLS for full names
const XLSX = require('xlsx')
const wb = XLSX.readFile(XLS_PATH)
const xlsRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
console.log(`XLS: ${xlsRows.length} personel kaydı`)

// 2. Build sicilNo → fullName map
const sicilToFullName = new Map()
for (const row of xlsRows) {
  const sicil = row['Sicil No']
  const name = normalizeTR(row['Ad Soyad'] || '')
  if (sicil && name) sicilToFullName.set(sicil, name)
}

// 3. Load danisanlar
const danisanlar = JSON.parse(readFileSync(join(DATA, 'danisanlar.json'), 'utf-8'))
console.log(`Danışan: ${danisanlar.length}`)

// Reset all fotograf fields
for (const d of danisanlar) d.fotograf = null

// 4. Build fullName → danisan(s) lookup
const byFullName = new Map()        // exact full name
const byFullNameAndTipi = new Map()  // full name + personelTipi

for (const d of danisanlar) {
  const fullName = sicilToFullName.get(d.sicilNo)
  if (!fullName) continue

  // Store full name on danisan for reference
  d._fullName = fullName

  if (!byFullName.has(fullName)) byFullName.set(fullName, [])
  byFullName.get(fullName).push(d)

  const key = `${fullName}|${d.personelTipi}`
  if (!byFullNameAndTipi.has(key)) byFullNameAndTipi.set(key, [])
  byFullNameAndTipi.get(key).push(d)
}

// 5. Scan photo directories
const photos = []
for (const src of SOURCES) {
  const before = photos.length
  scanDir(src.dir, src.tipiHint, photos)
  console.log(`[SCAN] ${src.tipiHint}: ${photos.length - before} fotoğraf`)
}
console.log(`Toplam taranan: ${photos.length}\n`)

// 6. Build photo lookups — each photo gets multiple candidate name keys
const photoByName = new Map()       // normalized name → photo[]
const photoByNameAndTipi = new Map()

for (const p of photos) {
  for (const cand of p.candidates) {
    if (!photoByName.has(cand)) photoByName.set(cand, [])
    photoByName.get(cand).push(p)

    const key = `${cand}|${p.tipiHint}`
    if (!photoByNameAndTipi.has(key)) photoByNameAndTipi.set(key, [])
    photoByNameAndTipi.get(key).push(p)
  }
}

// Also build abbreviated name lookup: "mustafa y." → photo[]
// From photo's shortest 2-word candidate (first + last name)
const photoByAbbrev = new Map()
const photoByAbbrevAndTipi = new Map()

for (const p of photos) {
  // Use the shortest candidate (2 words = first + last name typically)
  const shortest = p.candidates[p.candidates.length - 1]
  if (!shortest) continue
  const parts = shortest.split(' ')
  if (parts.length < 2) continue
  const lastPart = parts[parts.length - 1]
  const firstParts = parts.slice(0, -1).join(' ')
  const abbrev = `${firstParts} ${lastPart[0]}.`

  if (!photoByAbbrev.has(abbrev)) photoByAbbrev.set(abbrev, [])
  photoByAbbrev.get(abbrev).push(p)

  const key = `${abbrev}|${p.tipiHint}`
  if (!photoByAbbrevAndTipi.has(key)) photoByAbbrevAndTipi.set(key, [])
  photoByAbbrevAndTipi.get(key).push(p)
}

// 7. Match danisanlar to photos
if (!existsSync(FOTOS_DIR)) mkdirSync(FOTOS_DIR, { recursive: true })

let matched = 0
let noPhoto = 0
let noFullName = 0
let multiMatch = 0
const usedPhotos = new Set()
const strategyCount = { exactNameTipi: 0, exactName: 0, abbrevTipi: 0, abbrevOnly: 0 }

for (const d of danisanlar) {
  const fullName = d._fullName
  if (!fullName) { noFullName++; continue }

  // Strategy 1: exact full name + personelTipi
  const keyExact = `${fullName}|${d.personelTipi}`
  let photos = (photoByNameAndTipi.get(keyExact) ?? []).filter(p => !usedPhotos.has(p.path))
  let strategy = 'exactNameTipi'

  // Strategy 2: exact full name, any tipi
  if (photos.length === 0) {
    photos = (photoByName.get(fullName) ?? []).filter(p => !usedPhotos.has(p.path))
    strategy = 'exactName'
  }

  // Strategy 3: abbreviated name (from danisanlar) + personelTipi
  if (photos.length === 0) {
    const abbrevNorm = normalizeTR(d.adSoyad)
    const keyAbbrev = `${abbrevNorm}|${d.personelTipi}`
    photos = (photoByAbbrevAndTipi.get(keyAbbrev) ?? []).filter(p => !usedPhotos.has(p.path))
    strategy = 'abbrevTipi'
  }

  // Strategy 4: abbreviated name, any tipi
  if (photos.length === 0) {
    const abbrevNorm = normalizeTR(d.adSoyad)
    photos = (photoByAbbrev.get(abbrevNorm) ?? []).filter(p => !usedPhotos.has(p.path))
    strategy = 'abbrevOnly'
  }

  if (photos.length === 0) { noPhoto++; continue }
  if (photos.length > 1) multiMatch++

  const photo = photos[0]
  usedPhotos.add(photo.path)

  // Copy photo
  const destName = `${d.id}.jpg`
  try {
    copyFileSync(photo.path, join(FOTOS_DIR, destName))
    d.fotograf = destName
    matched++
    strategyCount[strategy]++
  } catch (err) {
    console.log(`[ERROR] ${d.adSoyad}: ${err.message}`)
  }
}

// 8. Clean up temp field and write
for (const d of danisanlar) delete d._fullName
writeFileSync(join(DATA, 'danisanlar.json'), JSON.stringify(danisanlar, null, 2), 'utf-8')

// 9. Summary
console.log(`\n=== ÖZET ===`)
console.log(`Eşleşen: ${matched} / ${danisanlar.length} danışan (${(matched / danisanlar.length * 100).toFixed(1)}%)`)
console.log(`Fotoğraf bulunamayan: ${noPhoto}`)
console.log(`XLS'de ismi olmayan: ${noFullName}`)
console.log(`Çoklu eşleşme: ${multiMatch}`)
console.log(`\nStrateji dağılımı:`)
console.log(`  1. Tam isim + personelTipi: ${strategyCount.exactNameTipi} (en güvenilir)`)
console.log(`  2. Tam isim (herhangi tipi): ${strategyCount.exactName}`)
console.log(`  3. Kısaltma + personelTipi: ${strategyCount.abbrevTipi} (riskli)`)
console.log(`  4. Kısaltma (herhangi tipi): ${strategyCount.abbrevOnly} (en riskli)`)
console.log(`\n✓ data/danisanlar.json güncellendi`)
console.log(`✓ data/fotos/ → ${matched} dosya`)
