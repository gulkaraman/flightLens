## Projeyi PowerShell ile Çalıştırma

### 1. Backend (Node / Express / Puppeteer)

PowerShell aç ve:

```powershell
cd C:\Users\monster\Desktop\bilet\backend

# (İlk kez veya bağımlılıklar değiştiyse)
npm install

# Env dosyasını oluştur (ilk kez)
copy .env.example .env

# Geliştirme sunucusunu başlat
npm run dev
```

Başarılıysa konsolda şu benzeri bir çıktı görürsün:

```text
Server listening on http://localhost:4000
```

### 2. Frontend (React / Vite)

Yeni bir PowerShell penceresi aç:

```powershell
cd C:\Users\monster\Desktop\bilet\frontend

# (İlk kez veya bağımlılıklar değiştiyse)
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

Başarılıysa konsolda şunu görürsün:

```text
Local:   http://localhost:5173/
```

### 3. Tarayıcıdan projeyi açma

- Frontend UI: `http://localhost:5173`
- Backend health kontrol: `http://localhost:4000/api/health` → `{ "ok": true }` dönmeli.

