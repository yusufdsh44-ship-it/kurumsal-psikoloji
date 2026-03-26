import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import * as XLSX from "xlsx"

const BFI_MADDELER = [
  "Dışadönük, sosyal", "Şefkatli, yumuşak kalpli", "Dağınık olma eğiliminde",
  "Rahat, stresle baş edebilen", "Sanatsal ilgileri az olan", "Atılgan, girişken",
  "Saygılı, başkalarına saygılı davranan", "Tembelliğe eğilimli",
  "Bir aksilik yaşadığında iyimserliğini koruyan", "Farklı birçok şeye merak duyan",
  "Nadiren heyecanlanan ya da heveslenen", "Başkalarında hata arama eğiliminde olan",
  "Güvenilir, istikrarlı", "Dakikası dakikasına uymayan, ruh hali inişli çıkışlı",
  "Yaratıcı, bir işi yapmanın akıllıca yöntemlerini bulan", "Sessiz olmaya eğilimli",
  "Başkalarının halinden pek anlamayan", "Sistemli, her şeyin düzenli olmasını seven",
  "Gergin olabilen", "Sanat, müzik ya da edebiyatla çok ilgili",
  "Baskın, lider gibi davranan", "Başkaları ile tartışma başlatan",
  "İşe başlamakta zorlanan", "Güvenli, kendiyle barışık",
  "Entelektüel, felsefi tartışmalardan kaçınan", "Başkalarından daha az hareketli",
  "Affedici bir yapısı olan", "Biraz özensiz olabilen",
  "Duygusal olarak dengeli, keyfi kolay kaçmayan", "Yaratıcı yönü zayıf olan",
  "Bazen utangaç, içe dönük", "Yardımsever, bencil olmayan",
  "Etrafını temiz ve derli toplu tutan", "Çok endişelenen",
  "Sanata ve estetiğe değer veren", "Başkalarını etkilemede zorlanan",
  "Zaman zaman başkalarına kaba davranan", "Verimli, iş bitiren",
  "Sıkça üzgün hisseden", "Çok yönlü, derin düşünen",
  "Enerji dolu", "Başkalarının iyi niyetinden şüphe eden",
  "Sözünde duran, başkalarının güvenebileceği", "Duygularını kontrol altında tutan",
  "Zihinde canlandırma yapmada zorlanan", "Konuşkan",
  "Soğuk ve başkalarını umursamayan", "Arkasını toplamayan, dağınık bırakan",
  "Nadiren kaygılanan ya da korkan", "Şiir ve tiyatroyu sıkıcı bulan",
  "Kararları başkalarının vermesini tercih eden", "Kibar, başkalarına nezaketle yaklaşan",
  "Kolay vazgeçmeyen, işin sonunu getiren", "Depresif, hüzünlü hissetmeye eğilimli",
  "Soyut konulara az ilgi duyan", "Coşku dolu",
  "Başkaları hakkında hep iyi düşünen", "Bazen sorumsuzca davranan",
  "Değişken mizaçlı, çabuk sinirlenen", "Özgün, yeni fikirler üreten",
]

const KSE_MADDELER = [
  "İçinizdeki sinirlilik ve titreme hali", "Baygınlık, baş dönmesi",
  "Bir başka kişinin düşüncelerinizi kontrol edeceği fikri",
  "Başınıza gelen sıkıntılardan dolayı başkalarının suçlu olduğu duygusu",
  "Olayları hatırlamada güçlük", "Çok kolayca kızıp öfkelenme",
  "Göğüs (kalp) bölgesinde ağrılar", "Meydanlık (açık) alanlardan korkma duygusu",
  "Yaşamınıza son verme düşünceleri", "İnsanların çoğuna güvenilmeyeceği hissi",
  "İştahta bozukluklar", "Hiçbir nedeni olmayan ani korkular",
  "Kontrol edemediğiniz duygu patlamaları",
  "Başka insanlarla beraberken bile yalnızlık hissetme",
  "İşleri bitirme konusunda kendini engellenmiş hissetme",
  "Yalnızlık hissetme", "Hüzünlü, kederli hissetme",
  "Hiçbir şeye ilgi duymama", "Ağlamaklı hissetme",
  "Kolayca incinebilme, kırılma",
  "İnsanların sizi sevmediğine, kötü davrandığına inanmak",
  "Kendini diğerlerinden daha aşağı görme", "Mide bozukluğu, bulantı",
  "Diğerlerinin sizi gözlediği ya da hakkınızda konuştuğu duygusu",
  "Uykuya dalmada güçlük",
  "Yaptığınız şeyleri tekrar tekrar doğru mu diye kontrol etme",
  "Karar vermede güçlükler",
  "Bu soruyu okuyorsanız \"Orta Derecede\" seçeneğini işaretleyiniz",
  "Otobüs, tren, metro gibi araçlarla seyahat etmekten korkma",
  "Nefes darlığı, nefessiz kalma", "Sıcak, soğuk basmaları",
  "Sizi korkuttuğu için bazı eşya, yer, etkinliklerden uzak kalma",
  "Kafanızın bomboş kalması",
  "Bedeninizin bazı bölgelerinde uyuşmalar, karıncalanmalar",
  "Günahlarınız için cezalandırılmanız gerektiği düşüncesi",
  "Gelecekle ilgili umutsuzluk duyguları içinde olmak",
  "Konsantrasyonda güçlük/zorlanma",
  "Bedenin bazı bölgelerinde zayıflık, güçsüzlük hissi",
  "Kendini gergin ve tedirgin hissetme", "Ölme ve ölüm üzerinde düşünceler",
  "Birini dövme, ona zarar verme, yaralama isteği",
  "Bir şeyleri kırma/dökme isteği",
  "Diğerlerinin yanında kendinin çok fazla farkında olmak",
  "Kalabalıklarda rahatsızlık duymak",
  "Bir başka insana hiç yakınlık duymamak", "Dehşet ve panik nöbetleri",
  "Sık sık tartışmaya girme", "Yalnız bırakıldığında sinirlilik hissetme",
  "Başarılarınız için yeterince takdir görmediğiniz düşüncesi",
  "Yerinde duramayacak kadar tedirgin hissetme",
  "Kendini değersiz görme, değersizlik duyguları",
  "İzin verdiğiniz takdirde insanların sizi sömüreceği duygusu",
  "Suçluluk duyguları", "Aklınızda bir bozukluk olduğu fikri",
]

interface TestSonucu {
  ad_soyad: string
  mudurluk: string
  test_turu: string
  cevaplar: number[]
  tarih: string
}

function buildSheet(
  testAdi: string,
  yonerge: string,
  maddeler: string[],
  sonuclar: TestSonucu[],
) {
  const rows: (string | number | null)[][] = []

  // Row 1: Başlık
  rows.push([testAdi])
  // Row 2: Yönerge
  rows.push([yonerge])
  // Row 3: Boş
  rows.push([])

  // Row 4: Header — No | Madde | Kişi1 | Kişi2 | ...
  const header: (string | number)[] = ["No", "Madde"]
  for (const s of sonuclar) {
    header.push(`${s.ad_soyad} (${s.mudurluk})`)
  }
  rows.push(header)

  // Row 5+: Maddeler ve cevaplar
  for (let i = 0; i < maddeler.length; i++) {
    const row: (string | number | null)[] = [i + 1, maddeler[i]]
    for (const s of sonuclar) {
      row.push(s.cevaplar[i] ?? null)
    }
    rows.push(row)
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Sütun genişlikleri
  ws["!cols"] = [
    { wch: 4 },  // No
    { wch: 55 }, // Madde
    ...sonuclar.map(() => ({ wch: 18 })), // Kişi sütunları
  ]

  return ws
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const singleId = url.searchParams.get("id")

  let query = supabase
    .from("test_sonuclari")
    .select("ad_soyad, mudurluk, test_turu, cevaplar, tarih")
    .eq("kaynak", "online")
    .order("tarih", { ascending: true })

  if (singleId) {
    query = supabase
      .from("test_sonuclari")
      .select("ad_soyad, mudurluk, test_turu, cevaplar, tarih")
      .eq("id", singleId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sonuclar = (data ?? []) as TestSonucu[]
  const bfiSonuclar = sonuclar.filter(s => s.test_turu === "BFI-2")
  const kseSonuclar = sonuclar.filter(s => s.test_turu === "KSE-53")

  const wb = XLSX.utils.book_new()

  // BFI-2 sheet
  const bfiSheet = buildSheet(
    "BFI-2 Kişilik Envanteri",
    "Kendimi ........ biri olarak görüyorum.  |  1: Hiç katılmıyorum  2: Biraz katılmıyorum  3: Kararsızım  4: Biraz katılıyorum  5: Tamamen katılıyorum",
    BFI_MADDELER,
    bfiSonuclar,
  )
  XLSX.utils.book_append_sheet(wb, bfiSheet, "BFI-2")

  // KSE-53 sheet
  const kseSheet = buildSheet(
    "KSE-53 Kısa Semptom Envanteri",
    "Son bir hafta içerisinde aşağıdaki durumların sizi ne ölçüde etkilediğini değerlendirin.  |  0: Hiç  1: Biraz  2: Orta D.  3: Epey  4: Çok F.",
    KSE_MADDELER,
    kseSonuclar,
  )
  XLSX.utils.book_append_sheet(wb, kseSheet, "KSE-53")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${singleId && sonuclar.length === 1 ? `Test_${sonuclar[0].ad_soyad.replace(/\s+/g, "_")}` : `Psikolojik_Testler_${new Date().toISOString().split("T")[0]}`}.xlsx"`,
    },
  })
}
