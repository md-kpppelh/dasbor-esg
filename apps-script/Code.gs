/**
 * Code.gs — router API Web App Dasbort ESG (Fase 4).
 *
 * Deploy di akun Google DEPLOYER (bukan pembuat). Cara:
 *   1) Sudah jalankan setupAwal() (Setup.gs) → 6 tab data bank terbentuk.
 *   2) Jalankan setPassword('admin','SANDI_BARU') sekali (Auth.gs) untuk set sandi admin.
 *   3) Deploy > New deployment > Web app > Execute as: Me · Who has access: Anyone.
 *   4) Salin URL Web App → isi ke app/lib/config.js (API_URL) di frontend.
 *
 * Baca (dashboard) bersifat publik. Tulis (data/config/akun/berita) wajib token login.
 * Klien mengirim POST dengan Content-Type text/plain agar tak memicu CORS preflight.
 */

function doGet(e) { return handle_(e, "GET"); }
function doPost(e) { return handle_(e, "POST"); }

function handle_(e, method) {
  var body = {};
  if (method === "POST" && e.postData && e.postData.contents) {
    try { body = JSON.parse(e.postData.contents); } catch (_) {}
  }
  var p = Object.assign({}, e.parameter, body);
  var action = p.action || "";
  try {
    var out;
    switch (action) {
      case "dashboard": out = Api_dashboard(p); break;                 // publik
      case "login":     out = Auth_login(p); break;
      case "upsertData":   out = requireAuth_(p, Admin_upsertData); break;
      case "updateConfig": out = requireAuth_(p, Admin_updateConfig); break;
      case "updateMetrik": out = requireAuth_(p, Admin_updateMetrik); break;
      case "account":      out = requireAuth_(p, Admin_account); break;
      case "berita":       out = requireAuth_(p, Admin_berita); break;
      case "audit":        out = requireAuth_(p, Admin_audit); break;
      default: out = { ok: false, error: "aksi tidak dikenal: " + action };
    }
    return json_(out);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Guard: verifikasi token lalu jalankan fn(p, session). */
function requireAuth_(p, fn) {
  var session = Auth_verify_(p.token);
  if (!session) return { ok: false, error: "sesi tidak valid / kedaluwarsa. Silakan login ulang." };
  return fn(p, session);
}
