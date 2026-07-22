/**
 * Setup.gs — membangun DATA BANK Dasbort ESG di Google Sheet.
 *
 * PORTABEL: dijalankan di akun Google MILIK DEPLOYER (bukan akun pembuat).
 * Tak ada kredensial/ID yang di-hardcode. Cara pakai:
 *   1) Buat Google Sheet baru di akun Anda.
 *   2) Extensions > Apps Script, tempel: seed_data.gs (hasil generate) + Setup.gs ini.
 *   3) Jalankan fungsi setupAwal() sekali, beri izin saat diminta.
 *   4) Enam tab akan dibuat & terisi seed Jan-Jun 2026.
 *
 * Bergantung pada variabel global SEED_ESG dari seed_data.gs.
 */

var TABS = {
  METRIK: ["Param_ID", "No", "Metrik", "Kategori", "Pilar", "Bobot", "Satuan", "Arah", "Target_2026", "Rumus", "Aktif"],
  DATA:   ["Param_ID", "Tahun", "Bulan", "Field", "Nilai"],
  CONFIG: ["Key", "Value"],
  AKUN:   ["Username", "PassHash", "Peran", "Nama", "Aktif"],
  LOG:    ["Waktu", "User", "Aksi", "Param", "NilaiLama", "NilaiBaru"],
  BERITA: ["Tanggal", "Judul", "Ringkasan", "Kategori", "Tautan", "Tampil"],
};

function setupAwal() {
  if (typeof SEED_ESG === "undefined") {
    throw new Error("seed_data.gs belum ditempel — variabel SEED_ESG tidak ditemukan.");
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (name) { ensureSheet_(ss, name, TABS[name]); });

  writeMetrik_(ss);
  seedData_(ss);
  writeConfig_(ss);
  writeAkunDefault_(ss);
  seedBerita_(ss);
  removeDefaultSheet_(ss);

  SpreadsheetApp.getActive().toast("Data bank ESG siap. Tab METRIK, DATA, CONFIG, AKUN, LOG, BERITA terisi.", "Dasbort ESG", 8);
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  sh.setFrozenRows(1);
  return sh;
}

function writeMetrik_(ss) {
  var sh = ss.getSheetByName("METRIK");
  var rows = SEED_ESG.metrics.map(function (m) {
    return [m.id, m.no, m.name, m.kategori, m.pilar, m.bobot, m.satuan, m.arah, m.target2026, m.rumus, m.aktif];
  });
  if (rows.length) sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function seedData_(ss) {
  var sh = ss.getSheetByName("DATA");
  var tahun = SEED_ESG.meta.tahun;
  var out = [];
  SEED_ESG.metrics.forEach(function (m) {
    var d = SEED_ESG.data[m.id] || {};
    for (var i = 0; i < 6; i++) { // Jan-Jun (bulan 1..6)
      if (d.aktual && d.aktual[i] != null) out.push([m.id, tahun, i + 1, "aktual", d.aktual[i]]);
      if (d.achievement && d.achievement[i] != null) out.push([m.id, tahun, i + 1, "achievement", d.achievement[i]]);
    }
  });
  if (out.length) sh.getRange(2, 1, out.length, 5).setValues(out);
}

function writeConfig_(ss) {
  var sh = ss.getSheetByName("CONFIG");
  var cfg = [
    ["judul", "Dashboard ESG PELH 2026"],
    ["tahun", SEED_ESG.meta.tahun],
    ["target_komposit", SEED_ESG.meta.target], // 1.0 = 100%
    ["cap", SEED_ESG.meta.cap],                 // 1.25 = 125%
    ["rag_green", 1.0],                         // >=100% hijau
    ["rag_yellow", 0.9],                        // 90-99% kuning; <90% merah
    ["forecast_metode", "linear"],
    ["data_as_of", SEED_ESG.meta.dataAsOf],
    ["astra_2030_nonfosil", 0.8],               // garis target jangka panjang Renewable
    ["logo_url", ""],
  ];
  sh.getRange(2, 1, cfg.length, 2).setValues(cfg);
}

function writeAkunDefault_(ss) {
  var sh = ss.getSheetByName("AKUN");
  // Placeholder — password asli di-set lewat panel Admin (Fase 4). GANTI segera.
  sh.getRange(2, 1, 1, 5).setValues([["admin", "GANTI_LEWAT_PANEL", "admin", "Administrator", true]]);
}

function seedBerita_(ss) {
  var sh = ss.getSheetByName("BERITA");
  sh.getRange(2, 1, 2, 6).setValues([
    ["2025-01-01", "KPP raih AREA 2025", "Health Promotion & Investment in People di Asia Responsible Enterprise Awards.", "Penghargaan", "", true],
    ["2022-01-01", "ISDA 2022 — 7 penghargaan", "Indonesian SDGs Award untuk program keberlanjutan.", "Penghargaan", "", true],
  ]);
}

function removeDefaultSheet_(ss) {
  var def = ss.getSheetByName("Sheet1") || ss.getSheetByName("Sheet");
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
}
