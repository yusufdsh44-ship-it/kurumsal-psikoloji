/**
 * Excel Personel Verisi İçe Aktarma Script'i
 *
 * Kaynak: TÜM PERSONEL BİLGİ RAPORU.xls (2.238 satır, 20 sütun)
 * Hedef: data/danisanlar.json + data/mudurlukler.json personelSayisi güncelleme
 *
 * Müdürlük eşleştirme: Excel isimleri → mudurlukler.json isimleri (doğrudan)
 * Tek alias: "İŞLETME VE İŞTİRAKLER MÜDÜRLÜĞÜ-SOSYAL TESİS" → "İşletme ve İştirakler Müdürlüğü"
 */

import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import XLSX from "xlsx"
import { nanoid } from "nanoid"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, "..")
const DATA_DIR = join(PROJECT_ROOT, "data")

const EXCEL_PATH = "/Users/yusufpamuk/Desktop/Raporlar ve Belgeler/LAZIM OLAN PERSONEL BİLGİLERİ/TÜM PERSONEL BİLGİ RAPORU.xls"

// ─── Tek alias: sosyal tesis alt-birimi → ana müdürlük ──────────────────

const MUDURLUK_ALIAS = {
  "İŞLETME VE İŞTİRAKLER MÜDÜRLÜĞÜ-SOSYAL TESİS": "İŞLETME VE İŞTİRAKLER MÜDÜRLÜĞÜ",
}

// ─── Enum Mappings ───────────────────────────────────────────────────────

const PERSONEL_TIPI_MAP = {
  "MEMUR": "Memur",
  "İŞÇİ": "İşçi",
  "ŞİRKET PERSONELİ": "Şirket Personeli",
}

const OGRENIM_MAP = {
  "OKURYAZAR": "İlkokul",
  "İLKÖĞRETİM(I.KISIM)": "İlkokul",
  "İLKÖĞRETİM(II.KISIM)": "Ortaokul",
  "ORTAOKUL": "Ortaokul",
  "LİSE": "Lise",
  "MESLEK LİSESİ": "Lise",
  "ÖN LİSANS(2 YIL)": "Ön Lisans",
  "YÜKSEK OKUL": "Ön Lisans",
  "LİSANS(4 YIL)": "Lisans",
  "YÜKSEK LİSANS": "Lisansüstü",
  "LİSANSÜSTÜ": "Lisansüstü",
  "DOKTORA": "Lisansüstü",
}

const CINSIYET_MAP = { "ERKEK": "Erkek", "KADIN": "Kadın" }

const MEDENI_DURUM_MAP = { "EVLİ": "Evli", "BEKAR": "Bekar", "BOŞANMIŞ": "Boşanmış", "DUL": "Dul" }

// ─── Türkçe Helpers ──────────────────────────────────────────────────────

function trUpper(s) {
  return s.toLocaleUpperCase("tr-TR").normalize("NFC")
}

function trTitleCase(word) {
  if (!word) return ""
  const lower = word.toLocaleLowerCase("tr-TR")
  const first = lower[0].toLocaleUpperCase("tr-TR")
  return first + lower.slice(1)
}

function formatName(raw) {
  if (!raw || !raw.trim()) return ""
  return raw.trim().split(/\s+/).map(trTitleCase).join(" ")
}

function parseDate(raw) {
  if (!raw || !raw.trim()) return ""
  const match = raw.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`
  return raw.trim()
}

function getSchool(row) {
  if (row[11] && String(row[11]).trim()) return { okul: String(row[11]).trim(), bolum: String(row[12] ?? "").trim() }
  if (row[9] && String(row[9]).trim()) return { okul: String(row[9]).trim(), bolum: String(row[10] ?? "").trim() }
  if (row[7] && String(row[7]).trim()) return { okul: String(row[7]).trim(), bolum: String(row[8] ?? "").trim() }
  return { okul: "", bolum: "" }
}

function safeStr(val) {
  if (val === null || val === undefined) return ""
  return String(val).trim()
}

function safeInt(val) {
  const n = parseInt(String(val), 10)
  return isNaN(n) ? 0 : n
}

/** Excel müdürlük adını → JSON'daki müdürlük adına normalize et */
function excelNameToJsonName(excelName) {
  // "DESTEK HİZMETLERİ MÜDÜRLÜĞÜ" → "Destek Hizmetleri Müdürlüğü"
  return excelName.split(/\s+/).map(trTitleCase).join(" ")
}

// ─── Main ────────────────────────────────────────────────────────────────

function main() {
  console.log("Excel okunuyor...")
  const wb = XLSX.readFile(EXCEL_PATH)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })
  console.log(`Toplam satır: ${rows.length}`)

  // ── Mevcut müdürlükler ──
  const mudurluklerPath = join(DATA_DIR, "mudurlukler.json")
  const mudurlukler = JSON.parse(readFileSync(mudurluklerPath, "utf-8"))

  // Build name→id map using Turkish locale uppercase
  const mudurlukNameToId = new Map()
  for (const m of mudurlukler) {
    mudurlukNameToId.set(trUpper(m.mudurlukAdi), m.id)
  }

  console.log(`Mevcut müdürlük: ${mudurlukler.length}`)

  // ── Process rows — first pass: collect unique müdürlük names ──
  const excelMudNames = new Map() // uppercase excel name → titlecased name
  for (let i = 1; i < rows.length; i++) {
    let mudRaw = safeStr(rows[i][3])
    if (!mudRaw) continue
    // Apply alias
    const upper = trUpper(mudRaw)
    const aliasTarget = MUDURLUK_ALIAS[upper]
    if (aliasTarget) mudRaw = aliasTarget
    const normalized = trUpper(mudRaw)
    if (!excelMudNames.has(normalized)) {
      excelMudNames.set(normalized, excelNameToJsonName(mudRaw))
    }
  }

  console.log(`Excel'deki benzersiz müdürlük: ${excelMudNames.size}`)

  // Create missing müdürlüks
  let newCount = 0
  for (const [upperName, titleName] of excelMudNames) {
    if (!mudurlukNameToId.has(upperName)) {
      const newId = nanoid()
      mudurlukler.push({
        id: newId,
        mudurlukAdi: titleName,
        personelSayisi: 0,
        genelMemnuniyet: null, isStresi: null, kurumDestegi: null,
        denge: null, ruhSagligiRiski: null, katilimOrani: null,
        riskSeviyesi: null, gorusulenPersonel: 0,
        sonRaporTarihi: null, anketRaporuHtml: null, kurumselKlinikRapor: null,
      })
      mudurlukNameToId.set(upperName, newId)
      console.log(`  Yeni müdürlük: ${titleName} (${newId})`)
      newCount++
    }
  }
  if (newCount === 0) console.log("  Tüm müdürlükler zaten mevcut.")

  // ── Second pass: build danışanlar ──
  const danisanlar = []
  const mudurlukCounts = new Map()
  const unmatchedMudurlukler = new Set()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const sicilNo = safeInt(row[0])
    if (sicilNo === 0) continue

    const adSoyadRaw = safeStr(row[1])
    if (!adSoyadRaw) continue

    // Müdürlük lookup
    let mudRaw = safeStr(row[3])
    const upperRaw = trUpper(mudRaw)
    const aliasTarget = MUDURLUK_ALIAS[upperRaw]
    const lookupKey = aliasTarget ? trUpper(aliasTarget) : upperRaw
    let mudurlukId = mudurlukNameToId.get(lookupKey)

    if (!mudurlukId) {
      unmatchedMudurlukler.add(mudRaw)
      mudurlukId = "UNKNOWN"
    }

    mudurlukCounts.set(mudurlukId, (mudurlukCounts.get(mudurlukId) || 0) + 1)

    const { okul, bolum } = getSchool(row)

    danisanlar.push({
      id: nanoid(),
      sicilNo,
      adSoyad: formatName(adSoyadRaw),
      mudurlukId,
      gorevUnvani: safeStr(row[5]) ? safeStr(row[5]).split(/\s+/).map(trTitleCase).join(" ") : "",
      personelTipi: PERSONEL_TIPI_MAP[trUpper(safeStr(row[2]))] || "Memur",
      cinsiyet: CINSIYET_MAP[trUpper(safeStr(row[13]))] || "",
      yas: safeInt(row[16]),
      medeniDurum: MEDENI_DURUM_MAP[trUpper(safeStr(row[19]))] || safeStr(row[19]),
      ogrenim: OGRENIM_MAP[trUpper(safeStr(row[6]))] || "İlkokul",
      okul,
      bolum,
      kidemGiris: parseDate(safeStr(row[14])),
      telefon: safeStr(row[18]),
      fotograf: null,
      triyajKademesi: null,
      gsiSkoru: null,
      kseKademe: null,
      bfiKademe: null,
      genelDurum: "Henüz Görülmedi",
      sonGorusme: null,
      sonrakiRandevu: null,
      anketTamamlandi: true,
      testTamamlandi: false,
      gorusmeYapildi: false,
      klinikOzet: "",
      notlar: "",
    })
  }

  // ── Update personelSayisi from actual counts ──
  for (const m of mudurlukler) {
    const count = mudurlukCounts.get(m.id)
    if (count !== undefined) {
      m.personelSayisi = count
    }
  }

  // ── Report ──
  console.log(`\nİşlenen kayıt: ${danisanlar.length}`)

  if (unmatchedMudurlukler.size > 0) {
    console.error(`\n⚠ EŞLEŞMEYEN MÜDÜRLÜKLER:`)
    for (const name of unmatchedMudurlukler) console.error(`  - "${name}"`)
  }

  // ── Write ──
  writeFileSync(join(DATA_DIR, "danisanlar.json"), JSON.stringify(danisanlar, null, 2), "utf-8")
  console.log(`\n✓ danisanlar.json yazıldı (${danisanlar.length} kayıt)`)

  writeFileSync(mudurluklerPath, JSON.stringify(mudurlukler, null, 2), "utf-8")
  console.log(`✓ mudurlukler.json güncellendi (${mudurlukler.length} müdürlük)`)

  // ── Verification ──
  const mudIds = new Set(mudurlukler.map(x => x.id))
  const orphans = danisanlar.filter(d => !mudIds.has(d.mudurlukId))
  const uniqueSicils = new Set(danisanlar.map(x => x.sicilNo))

  console.log(`\n─── Doğrulama ───`)
  console.log(`Benzersiz sicil: ${uniqueSicils.size}/${danisanlar.length}`)
  console.log(`Yetim danışan (müdürlüksüz): ${orphans.length}`)

  // Per müdürlük counts
  console.log(`\nMüdürlük | Personel`)
  console.log("─".repeat(55))
  let total = 0
  for (const m of mudurlukler.sort((a, b) => b.personelSayisi - a.personelSayisi)) {
    const actual = mudurlukCounts.get(m.id) || 0
    const match = m.personelSayisi === actual ? "✓" : "!!!"
    console.log(`${String(actual).padStart(5)}  ${m.mudurlukAdi.padEnd(45)} ${match}`)
    total += actual
  }
  console.log("─".repeat(55))
  console.log(`${String(total).padStart(5)}  TOPLAM`)

  if (orphans.length > 0) {
    console.error(`\n⚠ ${orphans.length} danışanın müdürlüğü bulunamadı!`)
  } else {
    console.log(`\n✓ Tüm danışanlar doğru müdürlüğe atandı`)
  }
}

main()
