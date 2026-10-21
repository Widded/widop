# Monopoly İstanbul — Mobil Öncelikli Oyun & Finans Takip Sistemi

Fiziksel **Monopoly İstanbul** kutu oyununda arkadaşlarınızla oynarken para, mülk, kira, ev, otel, ipotek ve oyuncular arası borç işlemlerini akıllı telefonlarınızdan kolayca takip etmenizi sağlayan modern, mobil öncelikli web uygulaması.

---

## 🚀 Öne Çıkan Özellikler

1. **Mobil Öncelikli & Koyu Tema:**
   - Koyu antrasit ve siyah tonlar (`#0a0e17`), modern kartlar, zarif zümrüt yeşili vurgular.
   - Parmakla rahat tıklanabilir geniş butonlar (min 44-48px), kaydırmalı alt paneller (bottom sheets).
   - Türkçe para biçimi (`1.500 ₺`) ve tarih formatı.

2. **Hızlı ve Hesapsız Katılım:**
   - E-posta, parola veya zorunlu PIN gerektirmez.
   - 6 haneli benzersiz oda kodu üretimi (Örn: `IST-482`).
   - Odayı oluşturan oyuncu otomatik olarak **Oda Sahibi** ve **Bankacı** olur.
   - Her yeni katılan oyuncuya **1.500 ₺** başlangıç sermayesi tanımlanır.
   - Tarayıcı yenilendiğinde veya kapatılıp açıldığında oturum güvenle korunur.

3. **Güvenli Finansal İşlemler:**
   - **Para Transferi:** İki adımlı onay, bakiye kontrolü, yetersiz bakiye engellemesi.
   - **Kira Sistemi:** Ev ve otel adetlerine göre otomatik kira hesaplama, ipotekli mülkte 0 ₺ kuralı, tek sefere mahsus mülk sahibi indirimi (örneğin 400 ₺ yerine 250 ₺ anlaşılan kira).
   - **Banka İşlemleri:** Başlangıçtan geçiş maaşı (+200 ₺), şans/kamu fonu ödülü, ceza ve vergiler (banka kredi/borç sistemi içermez).
   - **Oyuncular Arası Borç:** Borç verme (A bakiyesinden B bakiyesine doğrudan nakit aktarımı ve açık borç kaydı), kısmi borç ödeme, anlaşmalı indirimli borç kapatma (feragat).

4. **Doğrulanmış Monopoly İstanbul Mülk Yönetimi (28 Tapu Senedi):**
   - 8 Renk Grubu (Kasımpaşa, Dolapdere, Sultanahmet, Karaköy, Sirkeci, Beyoğlu, Beşiktaş, Taksim, Harbiye, Şişli, Mecidiyeköy, Bostancı, Erenköy, Caddebostan, Nişantaşı, Teşvikiye, Maçka, Levent, Etiler, Bebek, Yeniköy, Tarabya).
   - 4 İstasyon (Haydarpaşa Garı, Sirkeci Garı, Kadıköy İskelesi, Kabataş İskelesi).
   - 2 Kamu Kuruluşu (Elektrik İdaresi, Sular İdaresi).
   - Renk grubu tamamlama ve **eşit yapılaşma** kuralı kontrolü.
   - İpotek bedeli (%50) ve ipotek kaldırma (%10 faiz) hesaplaması.
   - Oyuncular arası tapu devri ve satış bedeli transferi.

5. **Ayrı Özel Bankacı Paneli:**
   - Yalnızca oda sahibi / bankacı tarafından erişilebilir.
   - Genel Bakış, Açıklamalı Para/Bakiye Düzeltmesi, Mülk Durumu Müdahalesi, Borç Denetimi, Hatalı İşlemler İçin Ters İşlem (İptal) Oluşturma ve Oyuncu Yönetimi.

6. **Çift Motorlu Mimari (Supabase Canlı + Yerel Senkronizasyon):**
   - Supabase bağlantı bilgileri girildiğinde PostgreSQL atomik RPC fonksiyonları ve Supabase Realtime ile çalışır.
   - Supabase bilgileri henüz girilmemişse, çoklu sekme (BroadcastChannel + LocalStorage) yerel senkronizasyon motoru devreye girer; sıfır konfigürasyonla anında test edilebilir.

---

## 🛠️ Yerel Ortamda Çalıştırma

Projeyi yerel bilgisayarınızda çalıştırmak için:

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda açın:
```
http://localhost:5173/
```

Üretim (Production) derlemesi almak için:
```bash
npm run build
```

---

## 🗄️ Supabase Veritabanı Kurulumu

Projede veritabanı şeması ve atomik SQL fonksiyonları hazır olarak `supabase/schema.sql` dosyasında yer almaktadır.

### Adım 1: Supabase Projesi Oluşturma
1. [supabase.com](https://supabase.com) adresinde ücretsiz bir proje oluşturun.
2. Sol menüden **SQL Editor** bölümüne gidin.
3. Projedeki `supabase/schema.sql` dosyasının tüm içeriğini yapıştırın ve **Run** butonuna basarak çalıştırın.

Bu işlem:
- `rooms`, `players`, `properties`, `transactions`, `debts`, `debt_payments` tablolarını oluşturur.
- Eşzamanlılık ve veri bütünlüğü indekslerini tanımlar.
- Row Level Security (RLS) politikalarını etkinleştirir.
- `atomic_transfer`, `atomic_pay_rent`, `atomic_bank_transaction`, `atomic_create_debt`, `atomic_pay_debt`, `atomic_banker_adjust_balance` atomik saklı yordamlarını (RPC) yükler.
- Supabase Realtime yayınını etkinleştirir.

### Adım 2: Çevre Değişkenlerini Tanımlama
Proje ana dizininde `.env` (veya `.env.local`) dosyası oluşturun:

```env
VITE_SUPABASE_URL=https://proje-kodunuz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

*Not: KESİNLİKLE `service_role` anahtarını istemci koduna veya `.env` dosyasına yazmayın. Yalnızca `anon` public anahtarını kullanın.*

---

## 🧪 20 Temel Senaryo Doğrulama Testi

Tüm Monopoly İstanbul kurallarını ve finansal gereksinimleri test etmek için hazırlanan test paketi:

```bash
node test-scenarios.js
```

### Test Edilen Senaryolar:
1. ✅ Oda oluşturma ve kurucuya otomatik 1.500 ₺ tanımlanması.
2. ✅ Odaya ikinci oyuncunun katılması ve otomatik 1.500 ₺ tanımlanması.
3. ✅ Odadaki tüm oyuncuların bakiyelerinin tutarlı görüntülenmesi.
4. ✅ Sayfa yenilendiğinde oturum ve oyuncu kimliğinin korunması.
5. ✅ Para transferinin gönderen ve alıcı bakiyelerini doğru güncellemesi (200 ₺).
6. ✅ Yetersiz bakiye ile para transferinin engellenmesi (5.000 ₺ denemesi).
7. ✅ Standart kira (400 ₺) yerine mülk sahibinin tek seferlik indirimli kira (250 ₺) tahsil edebilmesi.
8. ✅ İndirimli kiranın mülkün standart kira tablosunu değiştirmemesi.
9. ✅ Oyuncular arası borç verme (300 ₺ nakit transferi ve borç kaydı).
10. ✅ Borcun kısmi olarak ödenmesi (100 ₺ ödendi, 200 ₺ kaldı).
11. ✅ Kalan borcun anlaşmalı mutabakat ile kapatılması (150 ₺ ödendi, 50 ₺ silindi, borç kapandı).
12. ✅ Negatif ve mükerrer isteklerin atomik kontrol ile engellenmesi.
13. ✅ Bankadan mülk satın alma (Kasımpaşa, 60 ₺ bakiye düşüşü).
14. ✅ Ev/otel inşasında tam set zorunluluğu ve eşit yapılaşma kuralı kontrolü.
15. ✅ İpotekli mülkten 0 ₺ kira tahsilatı ve %10 faizle ipotek kaldırma.
16. ✅ Bankacı yetkili bakiye düzeltmesinin açıklamalı olarak geçmişte görünmesi.
17. ✅ Yetkisiz oyuncunun bankacı yetkilerine erişiminin engellenmesi.
18. ✅ Yalnızca oda kurucusuna oda sahibi rolü ve yetkisi verilmesi.
19. ✅ Finansal işlemlerde toplam para tutarlılığı.
20. ✅ 28 Monopoly İstanbul tapu senedinin (isimler, renkler, fiyatlar) tamlığı.

---

## 📋 Monopoly İstanbul Oyun Verileri

Sistemde kullanılan 28 adet tapu senedi ve maliyetleri:

| Mülk Adı | Renk / Grup | Satın Alma | Boş Arsa Kirası | Ev Maliyeti | İpotek Değeri |
|---|---|---|---|---|---|
| Kasımpaşa | Kahverengi | 60 ₺ | 2 ₺ (Tam set: 4 ₺) | 50 ₺ | 30 ₺ |
| Dolapdere | Kahverengi | 60 ₺ | 4 ₺ (Tam set: 8 ₺) | 50 ₺ | 30 ₺ |
| Haydarpaşa Garı | İstasyon | 200 ₺ | 25 - 200 ₺ | - | 100 ₺ |
| Sultanahmet | Açık Mavi | 100 ₺ | 6 ₺ (Tam set: 12 ₺) | 50 ₺ | 50 ₺ |
| Karaköy | Açık Mavi | 100 ₺ | 6 ₺ (Tam set: 12 ₺) | 50 ₺ | 50 ₺ |
| Sirkeci | Açık Mavi | 120 ₺ | 8 ₺ (Tam set: 16 ₺) | 50 ₺ | 60 ₺ |
| Beyoğlu | Pembe | 140 ₺ | 10 ₺ | 100 ₺ | 70 ₺ |
| Elektrik İdaresi | Kamu Kuruluşu | 150 ₺ | 4x veya 10x Zar | - | 75 ₺ |
| Beşiktaş | Pembe | 140 ₺ | 10 ₺ | 100 ₺ | 70 ₺ |
| Taksim | Pembe | 160 ₺ | 12 ₺ | 100 ₺ | 80 ₺ |
| Sirkeci Garı | İstasyon | 200 ₺ | 25 - 200 ₺ | - | 100 ₺ |
| Harbiye | Turuncu | 180 ₺ | 14 ₺ | 100 ₺ | 90 ₺ |
| Şişli | Turuncu | 180 ₺ | 14 ₺ | 100 ₺ | 90 ₺ |
| Mecidiyeköy | Turuncu | 200 ₺ | 16 ₺ | 100 ₺ | 100 ₺ |
| Bostancı | Kırmızı | 220 ₺ | 18 ₺ | 150 ₺ | 110 ₺ |
| Erenköy | Kırmızı | 220 ₺ | 18 ₺ | 150 ₺ | 110 ₺ |
| Caddebostan | Kırmızı | 240 ₺ | 20 ₺ | 150 ₺ | 120 ₺ |
| Kadıköy İskelesi | İstasyon | 200 ₺ | 25 - 200 ₺ | - | 100 ₺ |
| Nişantaşı | Sarı | 260 ₺ | 22 ₺ | 150 ₺ | 130 ₺ |
| Teşvikiye | Sarı | 260 ₺ | 22 ₺ | 150 ₺ | 130 ₺ |
| Sular İdaresi | Kamu Kuruluşu | 150 ₺ | 4x veya 10x Zar | - | 75 ₺ |
| Maçka | Sarı | 280 ₺ | 24 ₺ | 150 ₺ | 140 ₺ |
| Levent | Yeşil | 300 ₺ | 26 ₺ | 200 ₺ | 150 ₺ |
| Etiler | Yeşil | 300 ₺ | 26 ₺ | 200 ₺ | 150 ₺ |
| Kabataş İskelesi | İstasyon | 200 ₺ | 25 - 200 ₺ | - | 100 ₺ |
| Bebek | Yeşil | 320 ₺ | 28 ₺ | 200 ₺ | 160 ₺ |
| Yeniköy | Lacivert | 350 ₺ | 35 ₺ | 200 ₺ | 175 ₺ |
| Tarabya | Lacivert | 400 ₺ | 50 ₺ (Otel: 2.000 ₺) | 200 ₺ | 200 ₺ |

---

## 📱 Ekranlar ve Kullanım Akışı

1. **Giriş Ekranı:** Oda oluşturma (isim girip başlatma) veya odaya katılma (kod + isim). Varsa önceki kayıtlı oturumu 1 tıkla geri getirme.
2. **Ana Ekran:** Oda kodu (kopyalanabilir), güncel nakit bakiye, hızlı işlem butonları, oyuncu listesi (mülk, binalar, borç rozetleri).
3. **Oyuncu Detay Paneli:** Nakit bakiye, sahip olunan mülkler ve bina sayıları, açık borçlar ve alacaklar, geçmiş işlemler.
4. **Para Transferi:** 2 adımlı onay, bakiye doğrulama.
5. **Kira Ödeme:** Mülk seçimi, kurala göre standart kira hesaplaması, tek seferlik mülk sahibi indirim alanı ("Standart: 400 ₺ / Ödenecek: 250 ₺").
6. **Banka İşlemleri:** Maaş (+200 ₺), ödül, ceza ve vergi ödemeleri.
7. **Borç Yönetimi:** Borç verme, kısmi ödeme yapma, anlaşmalı indirimli kapatma.
8. **Mülkler Ekranı:** 28 mülkün renk gruplarına göre tapu kartları; satın alma, ev/otel dikme, ipotek etme, oyuncular arası takas/devir.
9. **İşlem Geçmişi:** Oyuncu ve tür bazlı filtreleme, zaman damgaları.
10. **Ayrı Bankacı Paneli:** Oda sahibi ve bankacı için 7 sekmeli yönetim paneli (Genel Bakış, Para Yönetimi, Mülk Müdahalesi, Borç Denetimi, Ters İşlem/İptal, Oyuncular).
