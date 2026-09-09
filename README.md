# Üretim Analiz ve Takip Sistemi

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![Python](https://img.shields.io/badge/Python-Pandas-3776AB?logo=python&logoColor=white)

Tesis, ürün ve vardiya bazında üretim süreçlerini izlemek; hedefleri, duruşları ve operasyonel performansı analiz etmek için geliştirilmiş web tabanlı bir karar destek uygulamasıdır.

Proje, Eti Maden Kütahya Emet işletmesindeki staj çalışması kapsamında üretim takibi problemini modelleyen kişisel bir yazılım projesidir. Kurumun resmî üretim sistemi değildir.

> [!IMPORTANT]
> Uygulamada ve ekran görüntülerinde yer alan tesis, ürün, kapasite, üretim, hedef ve duruş kayıtları tamamen yapay/sentetik olarak hazırlanmıştır. Gerçek üretim değerleri, kurumsal kayıtlar veya gizli işletme verileri kullanılmamıştır.

![Üretim Analiz ve Takip Sistemi dashboard ekranı](./photo/14.png)

## Projenin amacı

Dağınık üretim kayıtlarını tek bir uygulamada toplayarak şu sorulara cevap vermek amaçlanmıştır:

- Hangi tesiste, üründe ve vardiyada ne kadar üretim yapıldı?
- Üretim hedefinin ne kadarı gerçekleşti ve dönem sonunda beklenen sonuç nedir?
- Planlı ve plansız duruşların süresi, nedeni ve tahmini üretim kaybı nedir?
- Vardiyalar ve üretim tesisleri operasyonel olarak nasıl karşılaştırılıyor?
- Üretim serisinde normal aralığın dışında kalan günler var mı?

## Öne çıkan özellikler

### Üretim yönetimi

- Tesis, ürün ve tesis–ürün kapasite ilişkisi yönetimi
- Vardiya bazlı üretim kaydı oluşturma ve düzenleme
- Aktif/pasif kayıt ve üretim kaydı arşivleme işlemleri
- Tesis, ürün, vardiya, tarih, durum ve kaynağa göre filtreleme
- Çok sayıdaki üretim kaydı için sunucu taraflı sayfalama

### Hedef ve duruş yönetimi

- Günlük, haftalık, aylık ve özel dönem üretim hedefleri
- Hedef gerçekleşme oranı, kalan üretim ve dönem sonu tahmini
- Planlı ve plansız duruş kaydı yönetimi
- Duruş nedenleri, kategorileri ve sürelerinin takibi

### Excel işlemleri

- Üretim, hedef ve duruş kayıtları için Excel şablonları
- Aktarım öncesinde satır bazlı doğrulama ve önizleme
- Hatalı veya çakışan satır varsa toplu aktarımı durdurma
- İçe aktarma geçmişi ve işlem sonucu özeti
- Filtrelenen kayıtları Excel dosyası olarak dışa aktarma

### Analiz ve karar desteği

- Günlük üretim grafiği ve 7 günlük hareketli ortalama
- Çalışma oranı, kapasite kullanımı ve saatlik üretim KPI'ları
- Vardiya performansı karşılaştırması
- Duruş nedenleri için Pareto analizi
- IQR yöntemiyle üretim anomalisi tespiti
- Duruş sürelerine göre tahmini üretim kaybı
- Üretim hedefi risk durumu ve dönem sonu tahmini

## Analiz ekranları

### Günlük üretim trendi ve operasyonel performans

Aynı güne ait vardiya kayıtları birleştirilerek günlük üretim serisi oluşturulur. Eksik günler sıfır üretim kabul edilmez ve hareketli ortalamada yalnızca mevcut gözlemler kullanılır.

![Günlük üretim trendi ve operasyonel performans göstergeleri](./photo/15.png)

### Tahmini üretim kaybı

Üretim kaybı, seçilen tesis–ürün serisinin gerçekleşen saatlik üretim hızı ve duruş süresi kullanılarak tahmin edilir.

```text
Tahmini üretim kaybı = Saatlik üretim hızı × Duruş süresi (saat)
```

Bu sonuç kesin bir muhasebe veya kapasite kaybı değeri değil, kayıtlı verilere dayanan analitik bir tahmindir.

![Planlı ve plansız duruşlara göre tahmini üretim kaybı](./photo/16.png)

### Anomali ve Pareto analizi

IQR yöntemiyle normal üretim aralığının dışında kalan kayıtlar inceleme amacıyla işaretlenir. Bir kaydın anomali olması, doğrudan hatalı olduğu anlamına gelmez. Pareto analizi ise toplam duruş süresinde en fazla paya sahip nedenlerin görülmesini sağlar.

<table>
  <tr>
    <td width="50%">
      <img src="./photo/17.png" alt="Üretim anomalileri" />
      <br />
      <sub>Üretim anomalilerinin IQR yöntemiyle belirlenmesi</sub>
    </td>
    <td width="50%">
      <img src="./photo/18.png" alt="Duruş Pareto analizi" />
      <br />
      <sub>Duruş nedenlerinin Pareto analizi</sub>
    </td>
  </tr>
</table>

## Uygulama ekranları

### Tesis ve ürün yönetimi

<table>
  <tr>
    <td width="50%">
      <img src="./photo/4.png" alt="Tesis yönetimi" />
      <br />
      <sub>Tesis ve kapasite bilgileri</sub>
    </td>
    <td width="50%">
      <img src="./photo/5.png" alt="Ürün yönetimi" />
      <br />
      <sub>Ürünler ve bağlı oldukları tesisler</sub>
    </td>
  </tr>
</table>

![Tesis ve ürün arasında kapasite ilişkisi oluşturma](./photo/6.png)

### Üretim kayıtları

Üretim kayıtları filtrelenebilir, düzenlenebilir, arşivlenebilir ve ellişer kayıt halinde sayfalanabilir.

![Üretim kayıtlarının listelenmesi ve filtrelenmesi](./photo/7.png)

### Üretim hedefleri

Hedef kartlarında gerçekleşen miktar, kalan üretim, plan sapması, gerekli günlük üretim ve dönem sonu tahmini birlikte gösterilir.

![Üretim hedefleri ve hedef analizi](./photo/12.png)

### Üretim duruşları

Planlı ve plansız duruşlar; tesis, neden, kategori, kaynak ve süre bilgileriyle izlenir.

![Planlı ve plansız üretim duruşları](./photo/13.png)

## Excel ile veri aktarımı

Excel şablonu belirlenen kolon yapısını kullanıcıya sunar. Dosya içeriği veritabanına yazılmadan önce doğrulanır; tek bir hatalı veya çakışan satır bulunursa aktarımın tamamı durdurulur.

![Üretim kayıtları için Excel şablonu](./photo/9.png)

<table>
  <tr>
    <td width="50%">
      <img src="./photo/10.png" alt="Excel aktarım önizlemesi" />
      <br />
      <sub>Aktarım öncesi doğrulama ve hata gösterimi</sub>
    </td>
    <td width="50%">
      <img src="./photo/11.png" alt="Excel import geçmişi" />
      <br />
      <sub>Excel içe aktarma geçmişi</sub>
    </td>
  </tr>
</table>

Filtrelenen kayıtlar raporlama amacıyla yeniden Excel dosyasına aktarılabilir.

![Excel dosyası olarak dışa aktarılan üretim kayıtları](./photo/19.png)

<details>
  <summary><strong>Diğer teknik ekranları göster</strong></summary>

  ### Proje klasör yapısı

  ![Proje klasör yapısı](./photo/1.png)

  ### Veritabanı tasarımı

  ![Prisma Studio Visualizer üzerinde veritabanı ilişkileri](./photo/2.png)

  ### Sentetik üretim kayıtları

  ![Prisma Studio üzerinde sentetik üretim kayıtları](./photo/3.png)

  ### Üretim kaydı düzenleme

  ![Üretim kaydı düzenleme formu](./photo/8.png)
</details>

## Teknolojiler

| Katman | Kullanılan teknolojiler |
| --- | --- |
| Web uygulaması | Next.js 16, React 19, TypeScript |
| Arayüz | Tailwind CSS, Recharts, Lucide React |
| Veritabanı | MySQL 8, Prisma ORM, MariaDB bağlantı adaptörü |
| Doğrulama ve formlar | Zod, React Hook Form |
| Excel işlemleri | ExcelJS |
| Veri analizi | Python, Pandas |

## Mimari

```text
src/app                 Next.js sayfaları, API rotaları ve server action'lar
src/components          Form, filtre, grafik ve analiz bileşenleri
src/lib/queries         Prisma sorguları ve raporlama hesapları
src/lib/imports         Excel doğrulama ve içe aktarma akışları
src/lib/analytics       Next.js ile Python analiz katmanı arasındaki köprü
analytics               Pandas analiz çekirdeği ve Python testleri
prisma                  Veritabanı şeması ve migration dosyaları
photo                   README ve staj raporunda kullanılan ekran görüntüleri
```

## Veritabanı modeli

Uygulamanın temel veri modeli aşağıdaki kayıtları kapsar:

- Tesisler ve ürünler
- Tesis–ürün kapasite ilişkileri
- Vardiyalar ve üretim kayıtları
- Üretim hedefleri
- Duruş nedenleri ve duruş kayıtları
- Excel içe aktarma işlem geçmişi

![Prisma Studio Visualizer üzerinde ilişkisel veritabanı modeli](./photo/2.png)

## Başlıca sayfalar

| Sayfa | Adres | İçerik |
| --- | --- | --- |
| Dashboard | `/` | Genel üretim ve duruş özeti |
| Analiz | `/analytics` | Trend, KPI, Pareto, anomali ve üretim kaybı |
| Tesisler | `/facilities` | Tesis ve kapasite yönetimi |
| Ürünler | `/products` | Ürün ve tesis ilişkileri |
| Üretim | `/production` | Üretim kayıtları ve Excel aktarımı |
| Hedefler | `/targets` | Hedef yönetimi ve dönem sonu tahmini |
| Duruşlar | `/downtimes` | Planlı ve plansız duruş kayıtları |

## Kurulum

### Gereksinimler

- Node.js 20 veya üzeri
- npm
- MySQL 8
- Python 3.10 veya üzeri

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

## Test ve doğrulama

```powershell
& ".\node_modules\.bin\prisma.cmd" validate
& ".\node_modules\.bin\tsc.cmd" --noEmit
npm run lint
& ".\.venv\Scripts\python.exe" -m unittest discover -s analytics\tests -v
npm run build
```

Python testleri; eksik günlerin korunması, gerçek sıfır değerleri, birim dönüşümü, geçersiz tarihler, vardiya toplamları ve saatlik üretim oranlarını kapsar.
