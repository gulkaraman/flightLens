## FlightLens – Obilet Uçuş Scraper + UI

FlightLens, Obilet uçak bileti sayfasını (uçak bileti arama akışı) Puppeteer ile **type-safe** parametreler üzerinden tarayan ve sonuçları **aktarmasız uçuş odaklı** görsel bir arayüzle sunan bir demo projesidir.  
Amaç, gerçek bir web sitesinin DOM’unu bozmadan/yanlış kullanmadan okuyan, hem **backend scraping altyapısını** hem de **modern bir React arayüzünü** uçtan uca göstermek.

---

### Tech Stack

- **Backend**
  - Node.js + TypeScript
  - Express API (`/api/health`, `/api/latest`, `/api/search`)
  - Puppeteer (headless Chromium, Obilet scraping)
  - Zod ile type-safe config / request doğrulama
- **Frontend**
  - React + TypeScript + Vite
  - React Router
  - React Hook Form + Zod (form validasyonu)
  - Tailwind CSS + Framer Motion (modern UI + animasyon)
- **Diğer**
  - GitHub Actions (CI ve zamanlanmış scraper)
  - ESLint + Prettier

---

### Kurulum

**Gereksinimler**

- Node.js (önerilen: LTS, ≥ 20)
- npm

**Backend (API – varsayılan port 4000)**

```bash
cd backend
npm install

# Geliştirme
npm run dev        # http://localhost:4000
```

**Frontend (Web – varsayılan port 5173)**

```bash
cd frontend
npm install

# Geliştirme
npm run dev        # http://localhost:5173
```

> Not: Geliştirme modunda frontend, **relative `/api/...`** çağrılarını Vite proxy ile `http://localhost:4000` backend’ine yönlendirir. Üretimde isterseniz `VITE_API_BASE_URL` ile farklı bir API host’u tanımlayabilirsiniz.

---

### Deploy Notu (Prod Ortam)

- Frontend prod ortama deploy edildiğinde (hostname `localhost` dışında bir şey olduğunda):
  - `.env` veya ortam değişkenleri üzerinden **`VITE_API_BASE_URL`** mutlaka set edilmelidir.
  - Örnek: `VITE_API_BASE_URL=https://api.yourdomain.com`
  - Frontend API client’ı, bu durumda istekleri `https://api.yourdomain.com/api/...` adresine gönderir.
- Eğer `VITE_API_BASE_URL` boş bırakılır ve hostname localhost değilse:
  - Uygulama, istek atmadan önce şu hatayı gösterir:
    - `API adresi ayarlanmamış (VITE_API_BASE_URL).`
  - Böylece prod ortamda yanlışlıkla `localhost`’a fetch atma hatası erken yakalanır.

---

### Parametreleri Değiştirme (Config + .env)

Backend scraping parametreleri öncelikle `backend/config/search.json` içinde tutulur ve **Zod şeması** ile doğrulanır.  
Ek olarak bazı çalışma modları `.env` üzerinden ayarlanabilir (örnekler için `backend/.env.example` dosyasına bakın).

Örnek:

```json
{
  "tripType": "roundTrip",
  "from": "IST",
  "to": "SAW",
  "departDate": "2026-03-01",
  "returnDate": "2026-03-10",
  "passengers": {
    "adults": 1,
    "children": 0
  },
  "directOnly": false
}
```

- **tripType**
  - `"oneWay"`: Tek yön uçuş araması (sadece `departDate` kullanılır, `returnDate` yok sayılır).
  - `"roundTrip"`: Gidiş-dönüş uçuş araması (hem `departDate` hem `returnDate` zorunlu, backend’de Zod ile `returnDate >= departDate` kontrolü yapılır).
- **from / to**
  - Kalkış ve varış şehir/kod bilgileri (örn. `"IST"`, `"SAW"`, `"ADB"`).
  - Backend’de `normalizeCityInput` ile trim + whitespace normalize edilir.
- **departDate / returnDate**
  - Format: `YYYY-MM-DD` (ör. `"2026-03-01"`).
  - `roundTrip` için `returnDate` zorunlu ve `returnDate >= departDate` olmalıdır.
- **passengers**
  - `adults` ≥ 1
  - `children` ≥ 0
- **directOnly**
  - Varsayılan: `false`
  - `true`: scraper, sonuç sayfasında “Aktarmasız” filtresini UYGULAR; sadece direkt (non-stop) uçuşlar parse edilir.
  - `false`: scraper, sayfadaki “Aktarmasız” filtresini kapalı bırakır; hem direkt hem aktarmalı uçuşları parse etmeye çalışır.

Config yapısını değiştirdiğinizde:

- `backend/src/config/schema.ts` ve `backend/src/types.ts` tipleri ile uyumlu olmasına dikkat edin.
- README’deki bu config bölümünü ve örnek JSON’u güncelleyin.

> Not: `backend/config/search.json` çalışma zamanında okunur; isterseniz kendi makinenizde bu dosyayı düzenleyebilirsiniz. CI/GitHub Actions tarafında ise esas parametreler `.env` ve workflow env blokları üzerinden verilir.

---

### Uygulamayı Çalıştırma

**1) Canlı arama (UI üzerinden)**

1. Backend’i başlatın:
   ```bash
   cd backend
   npm run dev
   ```
2. Frontend’i başlatın:
   ```bash
   cd frontend
   npm run dev
   ```
3. Tarayıcıdan `http://localhost:5173` adresine gidin.
4. Arama kartında:
   - Trip tipi: **Tek yön** / **Gidiş-dönüş**
   - Nereden / Nereye
   - Gidiş tarihi (+ gerekirse dönüş tarihi)
   - Yolcu sayıları
5. **Ara** butonuna basın:
   - Frontend: `POST /api/search` ile backend’e istek atar, formu Zod ile doğrular.
   - Backend: Obilet uçak bileti sayfasında Puppeteer ile:
     - Arama formunu doldurur
     - “Aktarmasız” filtresini uygular
     - İlk uçuş kartlarını parse eder (`FlightResult[]`)
     - Sonucu hem response olarak döner hem de `backend/data/latest.json` dosyasına yazar.
   - Frontend: Sonuçları **Results** sayfasında modern kartlar olarak gösterir.

**2) CLI üzerinden scraping**

```bash
cd backend

# TypeScript üzerinden hızlı test (dev)
npm run dev:scrape

# veya build sonrası
npm run build
npm run scrape
```

- CLI, `backend/config/search.json` dosyasını okur (Zod ile doğrular).
- Puppeteer ile scraping akışını çalıştırır (`runSearch + applyDirectFilterAndParse`), `directOnly` alanına göre “Aktarmasız” filtresini uygular veya uygulamaz.
- Sonuçları `backend/data/latest.json` dosyasına **atomik** olarak yazar:
  - `{ runAtISO, params, results }` yapısında, 2 boşluklu okunabilir JSON.

---

### GitHub Actions Workflows

#### `ci.yml`

- **Konum**: `.github/workflows/ci.yml`
- **Tetikleyici**: `push` ve `pull_request`
- **Yaptıkları**:
  - **Backend job** (Node 20, `backend` dizini):
    - `npm ci`
    - `npm run lint`
    - `npm run build`
  - **Frontend job** (Node 20, `frontend` dizini):
    - `npm ci`
    - `npm run build`

Bu workflow, her commit/PR için hem backend hem frontend’in derlenebilir ve lint’ten geçebilir durumda olduğunu garanti eder.

#### `scraper.yml`

- **Konum**: `.github/workflows/scraper.yml`
- **Tetikleyiciler**:
  - `workflow_dispatch` (manuel çalıştırma)
  - `schedule` – **günde 1 kez** (örn. `0 3 * * *` cron ile)
- **Adımlar**:
  - Repo checkout
  - Node 20 kurulumu
  - Puppeteer/Chromium için gerekli Linux bağımlılıklarının `apt-get` ile kurulması
  - `backend` dizininde:
    - `npm ci`
    - `npm run build`
    - `npm run scrape`
  - `backend/data/latest.json` değişmişse:
    - `GITHUB_TOKEN` ile git user’ı `github-actions[bot]` olarak ayarlar.
    - `latest.json`’ı commit’ler ve push eder:
      - Commit mesajı: `chore: update latest flight scrape [skip ci]`
- **Permissions**:
  - `permissions: contents: write` – workflow’un `latest.json`’ı repo’ya yazabilmesi için gerekli.

---

### Debug Rehberi

**Selector kırılırsa (`selectors.ts`) ne yapmalı?**

Backend scraping katmanında, DOM değişikliklerine dayanıklı olmak için her kritik element için **birden fazla fallback selector** tanımlı:

- `backend/src/scraper/selectors.ts` içinde:
  - Arama formu selector’ları (trip type, from/to input, tarih alanları, yolcu sayacı, arama butonu).
  - Sonuç kartları için selector’lar (uçuş satırı, fiyat, havayolu, saat).
  - “Aktarmasız” filtresi için selector’lar.

Bir DOM güncellemesi sonrası scraping hata vermeye başlarsa:

- Hata mesajında genellikle şu bilgileri görebilirsiniz:
  - Beklenen aksiyon (ör. “Failed to click search button”).
  - Denenen selector’ların özeti (`selectorSummary` çıktısı).
- Adımlar:
  1. Tarayıcıda Obilet sayfasını açın, ilgili alanın güncel DOM yapısını inceleyin.
  2. `selectors.ts` içinde ilgili selector grubunu bulun (ör. `searchButtonCandidates`, `directFilterCandidates`).
  3. Yeni `data-testid`, class veya değişmiş path’e göre **yeni bir fallback selector** ekleyin ve açıklamasını (`description`) anlamlı tutun.
  4. Gerekirse eski selector’ları devre dışı bırakın ya da aşağı sıralara alın.

**Screenshot’lar nerede?**

- Scraping sırasında hata olduğunda, debug modu açıksa (`DEBUG_SCRAPER=true`) yardımcı fonksiyonlar şu klasöre screenshot bırakır:
  - `backend/artifacts/*.png`
- CLI veya API ile hata yaşarsanız:
  - Önce log’daki hata mesajını okuyun (hangi adımda kırıldığı).
  - Ardından ilgili timestamp’li screenshot’ı `artifacts` klasöründen kontrol edin.

---

### Etik ve Uyumluluk Notu

Bu proje **eğitim / demo amacıyla** geliştirilmiştir:

- Gerçek dünyadaki bir sitenin (Obilet) DOM’unu **salt okuma** amacıyla kullanır; hiçbir şekilde form dışı spam, yüksek frekanslı istek veya ticari kullanım hedeflemez.
- İlgili sitenin **kullanım koşulları**, **robots.txt** ve hukuki çerçevesi her zaman önceliklidir:
  - Üretim ortamında veya gerçek kullanıcı verisiyle kullanmadan önce, sitenin izin verdiği sınırlar ve hız limitleri mutlaka gözden geçirilmelidir.
  - Gerekirse scraping işlemi tamamen devre dışı bırakılmalı veya API tabanlı resmi entegrasyonlar tercih edilmelidir.
- Bu repo, “nasıl type-safe bir scraping ve UI katmanı tasarlanır?” sorusuna teknik cevap vermek için tasarlanmıştır; gerçek operasyonel kullanımlarda kendi yasal/etik değerlendirmelerinizi yapmalısınız.

---

### Staj Sorumlusuna 2–3 Dakikalık Demo Akışı

Kısa demo için aşağıdaki akış kullanılabilir:

1. **Genel mimariyi göster**
   - Klasör yapısını aç: `backend/`, `frontend/`, `.github/workflows/`.
   - Özetle: “Backend Puppeteer ile Obilet’ten aktarmasız uçuşları çekiyor, frontend de FlightLens UI’siyle gösteriyor.”

2. **Backend scraping + API’yi anlat**
   - `backend/config/search.json` içinden tripType / rota / tarih / yolcu parametrelerini göster.
   - `npm run dev:scrape` çalıştırıp `backend/data/latest.json` çıktısını göster.
   - `src/server.ts` içindeki `/api/search` endpoint’ini hızlıca göster: Zod validation, mutex, Puppeteer akışı, `latest.json` güncellemesi.

3. **Frontend deneyimini göster**
   - `npm run dev` (backend + frontend) çalıştır.
   - `http://localhost:5173` üzerinde:
     - FlightLens brand’li hero + animasyonu göster.
     - Arama kartına birkaç parametre gir, **Ara** de.
     - Results sayfasında:
       - Özet kartı, “Aktarmasız” badge’i, sıralama (fiyat/saat) ve FlightCard animasyonlarını göster.

4. **CI ve zamanlanmış scraper’dan bahset**
   - `ci.yml`: push/PR’da backend lint+build, frontend build.
   - `scraper.yml`: günde 1 kez (`cron`), scraping çalışıyor, `latest.json` değişmişse otomatik commit/push ediyor.


