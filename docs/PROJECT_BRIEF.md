## FlightLens – Proje Özeti (Staj Dokümanı)

### Amaç

FlightLens, Obilet’in uçak bileti arama sayfasını Puppeteer ile tarayıp sonuçları normalize eden ve React tabanlı bir arayüzde gösteren uçtan uca bir demo projesidir.  
Odak noktası:

- Gerçek bir web sitesini **headless Chromium** üzerinden kontrollü biçimde açmak
- Type-safe parametrelerle **scrape / cache / mock** modlarını yönetmek
- Kullanıcıya modern bir UI ile **aktarmasız / aktarmalı filtreleri** sunmak
- GitHub Actions ile hem **CI** hem de **zamanlanmış scraping** otomasyonu sağlamak

---

### Mimari (Yüksek Seviye)

- **frontend/**
  - React + TypeScript + Vite
  - Sayfalar:
    - `SearchPage`: arama formu, popüler rota kartları
    - `ResultsPage`: uçuş sonuçları, filtreler, “Aramayı Düzenle”, “Günlük Tahmini Fiyatlar”
  - State:
    - `SearchContext`: son arama parametrelerini tutar
    - `FilterContext`: sıralama ve “Aktarmasız” filtresi (`directOnly`)
  - API:
    - `/api/search` → normalleştirilmiş `SearchResponse`
    - `/api/latest` → son kaydedilmiş scraping sonucu
    - `/api/flights/search` → normalize edilmiş Obilet uçuş JSON’u (`FlightSearchResponse`)

- **backend/**
  - Express + TypeScript
  - Çekirdek endpoint’ler:
    - `GET /api/health`, `GET /health`
    - `GET /api/latest`
    - `POST /api/search` ve `POST /api/search/run`
    - `POST /api/capture` (fixtures için)
    - `GET /api/flights/search` (normalize JSON)
  - Scraper katmanı:
    - `src/scraper/browser.ts`: Puppeteer launch (`--no-sandbox`, `--disable-setuid-sandbox` CI’de)
    - `src/scraper/searchFlow.ts`: Obilet form doldurma ve arama akışı
    - `src/scraper/resultsParser.ts`: DOM parse, fiyat/aktarma tespiti
  - Fallback / cache:
    - `src/fallback/getResults.ts`: `SCRAPE_MODE` (`auto|live|cache|mock`) + cache/mocks
    - `backend/data/latest.json`: son scraping sonucu (Actions scraper bunu günceller)
  - DataService:
    - `src/data/DataService.ts`: normalize flights `/api/flights/search` için SWR mantığı ve hot key’ler

---

### Veri Akışı

1. Kullanıcı aramayı frontend’de başlatır (`SearchPage` veya “Aramayı Düzenle” modalı).
2. Frontend, `SearchParams` payload’ı ile `POST /api/search` çağırır.
3. Backend:
   - Parametreleri Zod (`SearchParamsSchema`) ile doğrular.
   - `getResultsWithFallback`:
     - `SCRAPE_MODE=live`: Puppeteer akışını çalıştırır, gerekirse cache’e yazar.
     - `SCRAPE_MODE=auto`: Önce live dener, hata alırsa cache veya mock’a düşer.
     - `SCRAPE_MODE=mock`: Deterministik mock uçuşlar (`generateMockFlights`).
   - Dönen sonuçları JSON olarak frontend’e iletir ve `backend/data/latest.json` içine yazar.
4. Frontend:
   - `ResultsPage`’de gelen `FlightResult[]` listesini filtre/sırala (fiyat, saat, “Aktarmasız”) uygulayarak kartlar halinde gösterir.
   - “Günlük Tahmini Fiyatlar” bileşeni, mevcut fiyatlardan tahmini günlük histogram üretip kullanıcıya alternatif gün önerir.

---

### Filtreler ve “Aktarmasız” Davranışı

- UI tarafında:
  - `FilterContext` içindeki `directOnly` state’i “Aktarmasız” toggle’ını kontrol eder.
  - Default: `false` → **Tümü (aktarmalı + aktarmasız)**.
  - `true` olduğunda:
    - `ResultsPage` içindeki `applyFilters`, uçuşların **aktarma sayısını** hesaplayıp `stops > 0` olanları eleyerek sadece direkt uçuşları bırakır.
- Backend tarafında:
  - `SearchParams.directOnly` alanı:
    - CLI / scraping config için kullanılır (`backend/config/search.json`).
    - `true` ise scraper, Obilet sayfasındaki “Aktarmasız” butonuna tıklar ve sadece non-stop kartları parse eder.
    - `false` ise filtre tıklanmaz; hem direkt hem aktarmalı uçuşlar parse edilir.
- Ek kontrol:
  - Backend’teki `smoke` ve `scrape:obilet`/`scrape:check` script’leri, hem “non-stop=true” hem de “non-stop=false” senaryolarında sonuç sayısı ve fiyat alanlarının doluluğunu raporlar; böylece “her şey DİREKT” / “fiyat yok” hataları tekrar etmesin diye guard görevi görür.

---

### GitHub Actions Otomasyonu

- **CI Workflow – `.github/workflows/ci.yml`**
  - Tetik: `push`, `pull_request`
  - Backend job:
    - Node 20
    - `npm ci`
    - `npm run lint`
    - `npm run build`
    - `npm test` (Vitest)
  - Frontend job:
    - Node 20
    - `npm ci`
    - `npm run build`
  - Canlı scraping çalıştırmaz; CI tamamen **deterministik** lint/build/test akışından ibarettir.

- **Scraper Workflow – `.github/workflows/scraper.yml`**
  - Tetik:
    - `workflow_dispatch` (manuel)
    - `schedule: 0 3 * * *` (her gün 03:00 UTC)
  - Adımlar:
    - Linux bağımlılıklarını yükler (Puppeteer/Chromium için)
    - `backend` dizininde `npm ci`, `npm run build`, `npm run scrape`
    - `backend/data/latest.json` değişmişse:
      - GitHub Actions bot user ile commit/push (`permissions: contents: write`)
  - Bu workflow, staj sorumlusunun **manuel veya otomatik** olarak en güncel flight snapshot’ını almasını sağlar.

---

### Nasıl Çalıştırılır? (Özet)

1. Backend:
   ```bash
   cd backend
   npm install
   npm run dev    # http://localhost:4000
   ```
2. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev    # http://localhost:5173
   ```
3. Tarayıcıdan `http://localhost:5173`’e gidin, arama kartından parametreleri girip **Ara** deyin.
4. Results sayfasında:
   - “Aktarmasız” filtresini aç/kapa; kartlardaki “DİREKT / AKTARMALI” badge’leriyle beraber liste nasıl değişiyor göster.
   - “Aramayı Düzenle” ile rota/tarih/yolcu sayısını değiştirip yeni sonuçların geldiğini göster.
   - “Günlük Tahmini Fiyatlar” şeridinde bir gün seçip “Seç ve Ara” diyerek departDate’in değiştiğini ve listenin buna göre güncellendiğini göster.

---

### Acceptance Checklist

- [x] `/api/search` ve `/api/flights/search` endpoint’leri type-safe parametrelerle çalışıyor.
- [x] “Aktarmasız” filtresi:
  - UI’da default **kapalı** (tümü gösterir),
  - Açıkken sadece direkt uçuşlar listelenir.
- [x] Puppeteer scraper:
  - CI’da çalışmaz (sadece lint/build/test),
  - Zamanlanmış/manuel workflow üzerinden güvenli argümanlarla (`--no-sandbox`) koşar.
- [x] GitHub Actions:
  - `ci.yml` push/PR’de yeşil tik sağlar,
  - `scraper.yml` günlük scraping yapar, `backend/data/latest.json`’ı günceller.
- [x] README, `.env.example` ve bu doküman, staj sorumlusu için projeyi baştan sona anlatacak netliktedir.

