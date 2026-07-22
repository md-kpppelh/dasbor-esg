/**
 * Auth.gs — login, token sesi, dan pengelolaan sandi (Fase 4).
 * Sandi disimpan sebagai hash HMAC-SHA256 (bukan plaintext). Token sesi ber-expiry & bertanda tangan.
 */

var SESSION_HOURS = 8;

function secret_() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty("AUTH_SECRET");
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty("AUTH_SECRET", s); }
  return s;
}

function hmac_(msg) {
  var raw = Utilities.computeHmacSha256Signature(msg, secret_());
  return Utilities.base64EncodeWebSafe(raw);
}

/** Jalankan SEKALI di editor untuk set sandi: setPassword('admin','SandiBaru'). */
function setPassword(username, plain) {
  var sh = SpreadsheetApp.getActive().getSheetByName("AKUN");
  var rows = sh.getDataRange().getValues();
  for (var r = 1; r < rows.length; r++) {
    if (String(rows[r][0]).trim() === String(username).trim()) {
      sh.getRange(r + 1, 2).setValue(hmac_(plain));
      return "OK: sandi " + username + " di-set.";
    }
  }
  throw new Error("username tidak ditemukan: " + username);
}

function Auth_login(p) {
  var u = String(p.username || "").trim();
  var pass = String(p.password || "");
  if (!u || !pass) return { ok: false, error: "username & sandi wajib." };
  var sh = SpreadsheetApp.getActive().getSheetByName("AKUN");
  var rows = sh.getDataRange().getValues();
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (String(row[0]).trim() === u) {
      if (String(row[4]).toLowerCase() === "false") return { ok: false, error: "akun nonaktif." };
      if (String(row[1]) !== hmac_(pass)) break; // sandi salah
      return { ok: true, token: makeToken_(u, row[2]), user: { username: u, peran: row[2], nama: row[3] } };
    }
  }
  return { ok: false, error: "username atau sandi salah." };
}

function makeToken_(username, peran) {
  var exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  var payload = Utilities.base64EncodeWebSafe(JSON.stringify({ u: username, p: peran, exp: exp }));
  return payload + "." + hmac_(payload);
}

/** Kembalikan {u,p,exp} bila token sah & belum kedaluwarsa, else null. */
function Auth_verify_(token) {
  if (!token || token.indexOf(".") < 0) return null;
  var parts = token.split(".");
  if (hmac_(parts[0]) !== parts[1]) return null;
  try {
    var data = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch (_) { return null; }
}
