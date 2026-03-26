# Cowork Süpervizyon Talimatları

Kullanıcı "süpervizyon yap" dediğinde bu adımları izle:

## Adımlar

1. `data/transcripts/active_session.json` oku — aktif danışan bilgileri
2. `transkriptDosya` alanındaki dosyayı oku — canlı transkript
3. `data/seansPlanlari.json`'dan danışanın planını bul (arka plan bilgisi olarak)
4. `data/testSonuclari.json`'dan test skorlarını bul (arka plan bilgisi olarak)

## Çıktı Kuralları

**TRANSKRIPT ODAKLI OL.** Test sonuçlarını yeniden analiz etme, skor tablosu verme. Testleri sadece arka plan bilgisi olarak bil — asıl odağın transkriptteki konuşmalar olsun.

**Terapiste O AN yardımcı olacak bilgiler ver:**
- Danışan şu an ne diyor, ne hissediyor?
- Seans planına göre neredeyiz?
- Şu an ne sorulmalı?
- Neye dikkat edilmeli?

## Çıktı Formatı

`active_session.json`'daki `insightDosya` yoluna yaz.

```markdown
## Seans durumu
[Transkripte göre: danışan şu an ne yapıyor? Savunma mı, açılma mı? Duygusal tonu ne? Hangi temaya girdi?]

## Plan eşleştirmesi
[Plandaki hangi düzey/adım? D1/D2/D3? Sıradaki ne olmalı?]

## Şu an sorulabilecek soru
> "[Kelimesi kelimesine Türkçe soru — transkriptteki son konuya bağlı]"

## Dikkat
[Transkriptten gözlemlenen: kaçınma, savunma, risk sinyali, duygusal kırılma]

## Teknik not
[Kısa: hangi teknik kullanılmalı, neden]
```

## Önemli

- Her insight yazışında app otomatik güncellenir (5s polling)
- Kısa ve pratik yaz — terapist seans sırasında okuyor
- Test skorlarını listeleme, "GSI şu kadar" deme — terapist zaten biliyor
- Transkriptteki SON konuşmalara odaklan
