# Dasbort ESG — PELH 2026

Executive ESG Monitoring Dashboard untuk site PELH (KPP · PAMA · United Tractors).
Menampilkan pencapaian ESG Index bulanan, YTD, forecast, dan dokumentasi foto/video.

## Stack
- React 18 + Vite 6
- Motion (framer-motion) + Lenis (smooth scroll)
- Chart SVG kustom (tanpa lib chart)
- Engine perhitungan ESG murni JS (`engine/esg-engine.js`) — satu sumber rumus, meniru sheet "Index ESG" Excel

## Menjalankan
```bash
npm install
npm run dev      # http://localhost:5173
```

## Perintah lain
```bash
npm run build    # bundel produksi ke dist/
npm run preview  # pratinjau hasil build
npm test         # uji paritas: engine wajib = angka Excel (Jun 110,8%)
```

## Struktur
```
app/
  App.jsx                 rakitan halaman (topbar, hero, galeri, pilar, dashboard)
  index.css               tema editorial gelap (Clash Display + DM Mono)
  three/Hero.jsx          hero editorial + slot media
  components/
    Dashboard.jsx         KPI, tren+forecast, scoring (Manajemen/Audit), heatmap, insight
    charts.jsx            gauge, trend, waterfall, heatmap, sparkline (SVG)
    scrolly.jsx           velocity marquee, stacking pilar, parallax
    Media.jsx             slot unggah foto/video (file / URL)
  lib/
    model.js              view-model dari seed + engine
    insights.js           insight otomatis
    anim.jsx              Reveal, CountUp, useLenis
    format.js             format angka id-ID
data/seed-esg.json        data Jan–Jun 2026 (hasil ekstrak dari Excel master)
engine/esg-engine.js      mesin rumus ESG
tests/parity.test.js      uji paritas vs Excel
apps-script/              backend data bank Google Sheet (Fase 4)
  Setup.gs                bangun 6 tab + isi seed (setupAwal)
  Code.gs · Api.gs        router + baca publik (dashboard)
  Auth.gs · Admin.gs      login/token + tulis data (auth)
scripts/extract_seed.py   ekstraktor seed dari Excel master (butuh file sumber, tidak disertakan)
```

## Backend Google Sheet (Fase 4)
1. Buat Google Sheet baru → Extensions → Apps Script.
2. Tempel isi semua file `apps-script/*.gs`. Jalankan `setupAwal()` (buat 6 tab + seed).
3. Jalankan `setPassword('admin','SANDI_ANDA')` sekali untuk set sandi admin.
4. Deploy → New deployment → Web app → *Execute as: Me*, *Who has access: Anyone* → salin URL.
5. Isi URL itu ke `app/lib/config.js` → `API_URL`. Kosong = pakai seed statis (mode review).

## Catatan
- Sumber data saat ini: `data/seed-esg.json` (statis, data s/d Juni 2026). Setelah `API_URL` diisi, app menarik dari data bank. Login Admin/User + panel edit = kelanjutan Fase 4.
- Foto/video pada slot media disimpan di `localStorage` browser (demo); penyimpanan permanen menyusul di Fase 4/5.
- File Excel sumber bersifat privat dan **tidak** disertakan di repo.
