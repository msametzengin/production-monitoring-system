# Üretim Analiz ve Takip Sistemi

Tesis, ürün ve vardiya bazında üretim süreçlerini izlemek; hedefleri, duruşları ve operasyonel performansı analiz etmek için geliştirilmiş web tabanlı bir karar destek uygulamasıdır.

Proje, Eti Maden Kütahya Emet işletmesindeki staj çalışması kapsamında üretim takibi problemini modelleyen kişisel bir yazılım projesidir. Kurumun resmî üretim sistemi değildir.

> [!IMPORTANT]
> Uygulamada ve proje tanıtımında kullanılan tesis, ürün, kapasite, üretim, hedef ve duruş kayıtları tamamen yapay/sentetik olarak oluşturulmuştur. Gerçek üretim değerleri, kurumsal kayıtlar veya gizli işletme verileri kullanılmamıştır. Kurum ve tesis adları yalnızca senaryo bağlamı sağlamak amacıyla yer almaktadır.

## Projenin amacı

Dağınık üretim kayıtlarını tek bir uygulamada toplayarak aşağıdaki sorulara yanıt vermek:

- Hangi tesiste, hangi ürün ve vardiyada ne kadar üretim yapıldı?
- Üretim hedeflerinin ne kadarı gerçekleşti ve dönem sonunda beklenen sonuç nedir?
- Planlı ve plansız duruşların süresi, nedeni ve üretime tahmini etkisi nedir?
- Vardiyalar, tesisler ve ürünler operasyonel olarak nasıl karşılaştırılıyor?
- Üretim serisinde olağandışı günler veya belirgin trend değişimleri var mı?

## Özellikler

### Temel veri yönetimi

- Tesis ve ürün CRUD işlemleri
- Tesis–ürün ilişkisi ve nominal kapasite yönetimi
- Vardiya bazlı üretim kaydı oluşturma ve düzenleme
- Üretim kayıtlarını arşivleme
- Duruş nedeni ve duruş kaydı yönetimi
- Günlük, haftalık, aylık ve özel dönem üretim hedefleri
- Aktif/pasif kayıt yönetimi ve alan doğrulamaları

### Veri aktarımı ve raporlama

- Üretim, hedef ve duruş kayıtları için Excel şablonları
- Dosyayı veritabanına yazmadan önce satır bazlı önizleme ve doğrulama
- Hatalı veya çakışan satır bulunduğunda toplu aktarımı durdurma
- İçe aktarma geçmişi ve sonuç özeti
- Filtrelenmiş kayıtları Excel'e aktarma
- Tesis, ürün, vardiya, tarih, durum ve kaynak bazlı filtreleme

### Dashboard ve analiz

- Günlük üretim grafikleri ve 7 günlük hareketli ortalama
- Kayıt bulunmayan gün ile gerçek sıfır üretim değerinin ayrı değerlendirilmesi
- Vardiya karşılaştırması ve saatlik üretim hızı
- Çalışma oranı, kapasite kullanımı ve ortalama günlük üretim KPI'ları
- Duruş nedenleri için Pareto analizi ve kümülatif `%80` sınırı
- IQR yöntemiyle üretim anomalisi tespiti
- Hedef gerçekleşme, kalan üretim ve plan çizgisine göre sapma
- Kalan günlere göre gerekli günlük üretim ve dönem sonu tahmini
- Planlı/plansız duruşlara göre tahmini üretim kaybı

## Tahmini üretim kaybı

Üretim kaybı, seçilen tesis–ürün serisinin gerçekleşen saatlik üretim hızı kullanılarak hesaplanır:

```text
Tahmini üretim kaybı = Saatlik üretim hızı × Duruş süresi (saat)
```

Planlı ve plansız duruş kayıpları ayrı gösterilir. Bu sonuç bir muhasebe veya kesin kapasite kaybı değeri değil; kayıtlı üretim hızı ve duruş sürelerine dayanan analitik bir tahmindir. Duruşlar tesis seviyesinde tutulduğu için aynı tesiste birden fazla ürün bulunması durumunda sonuç her ürün serisi için ayrı yorumlanmalıdır.

## Teknolojiler

- Next.js 16 ve React 19
- TypeScript
- Tailwind CSS
- MySQL 8
- Prisma ORM ve MariaDB bağlantı adaptörü
- Python ve Pandas
- Recharts
- Zod
- ExcelJS

## Mimari

```text
src/app                 Next.js sayfaları, API rotaları ve server action'lar
src/components          Form, filtre, grafik ve analiz bileşenleri
src/lib/queries         Prisma sorguları ve raporlama hesapları
src/lib/imports         Excel doğrulama ve içe aktarma akışları
src/lib/analytics       Next.js ile Python analiz katmanı arasındaki köprü
analytics               Pandas analiz çekirdeği ve Python testleri
prisma                  Veritabanı şeması ve migration dosyaları
```

## Gereksinimler

- Node.js 20 veya üzeri
- npm
- MySQL 8
- Python 3.10 veya üzeri

## Kurulum

### 1. Repoyu klonlayın

```bash
git clone https://github.com/msametzengin/production-monitoring-system.git
cd production-monitoring-system
```

### 2. Node.js bağımlılıklarını kurun

```bash
npm install
```

### 3. Ortam değişkenini tanımlayın

Proje kökünde `.env` dosyası oluşturun:

```env
DATABASE_URL="mysql://KULLANICI:PAROLA@localhost:3306/production_monitoring"
```

Yerel geliştirmede kullanılan MySQL hesabının migration oluşturmak için gerekli şema, tablo ve indeks yetkilerine sahip olması gerekir.

### 4. Prisma şemasını uygulayın

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Python analiz ortamını kurun

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
& ".\.venv\Scripts\python.exe" -m pip install -r analytics\requirements.txt
```

Linux/macOS:

```bash
./.venv/bin/python -m pip install -r analytics/requirements.txt
```

Varsayılan `.venv` yolu yerine farklı bir Python çalıştırıcısı kullanılacaksa `.env` dosyasına aşağıdaki değişken eklenebilir:

```env
PYTHON_EXECUTABLE="C:/Python/python.exe"
```

### 6. Uygulamayı çalıştırın

```bash
npm run dev
```

Ardından [http://localhost:3000](http://localhost:3000) adresini açın.

## Başlıca sayfalar

| Sayfa | Adres | İçerik |
| --- | --- | --- |
| Dashboard | `/` | Genel üretim ve duruş özeti |
| Analiz | `/analytics` | Trend, KPI, Pareto, anomali ve üretim kaybı |
| Tesisler | `/facilities` | Tesis ve kapasite yönetimi |
| Ürünler | `/products` | Ürün ve tesis ilişkileri |
| Üretim | `/production` | Üretim kayıtları ve Excel aktarımı |
| Hedefler | `/targets` | Hedef yönetimi ve dönem sonu tahmini |
| Duruşlar | `/downtimes` | Planlı/plansız duruş kayıtları |

## Test ve doğrulama

```powershell
& ".\node_modules\.bin\prisma.cmd" validate
& ".\node_modules\.bin\tsc.cmd" --noEmit
npm run lint
& ".\.venv\Scripts\python.exe" -m unittest discover -s analytics\tests -v
npm run build
```

Python testleri; eksik günlerin korunması, gerçek sıfır değerleri, birim dönüşümü, geçersiz tarihler, vardiya toplamları ve saatlik üretim oranlarını kapsar.