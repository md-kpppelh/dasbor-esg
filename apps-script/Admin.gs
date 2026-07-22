/**
 * Admin.gs — penulisan data bank (wajib token). Semua perubahan dicatat ke LOG.
 */

function findRow_(sh, matchCols) {
  var v = sh.getDataRange().getValues();
  for (var r = 1; r < v.length; r++) {
    var ok = true;
    for (var c in matchCols) { if (String(v[r][c]) !== String(matchCols[c])) { ok = false; break; } }
    if (ok) return r + 1; // 1-based row
  }
  return -1;
}

function log_(session, aksi, param, lama, baru) {
  var sh = SpreadsheetApp.getActive().getSheetByName("LOG");
  sh.appendRow([new Date(), (session && session.u) || "?", aksi, param, lama, baru]);
}

/** Set/ubah satu nilai DATA (param·tahun·bulan·field). */
function Admin_upsertData(p, session) {
  var param = String(p.param), tahun = Number(p.tahun), bulan = Number(p.bulan), field = String(p.field);
  var nilai = p.nilai === "" || p.nilai == null ? "" : Number(p.nilai);
  if (!param || !(bulan >= 1 && bulan <= 12) || !field) return { ok: false, error: "param/bulan/field wajib." };
  var sh = SpreadsheetApp.getActive().getSheetByName("DATA");
  var row = findRow_(sh, { 0: param, 1: tahun, 2: bulan, 3: field });
  var lama = "";
  if (row > 0) { lama = sh.getRange(row, 5).getValue(); sh.getRange(row, 5).setValue(nilai); }
  else sh.appendRow([param, tahun, bulan, field, nilai]);
  log_(session, "upsertData", param + " " + bulan + " " + field, lama, nilai);
  return { ok: true };
}

/** Ubah satu key CONFIG. */
function Admin_updateConfig(p, session) {
  var key = String(p.key); if (!key) return { ok: false, error: "key wajib." };
  var sh = SpreadsheetApp.getActive().getSheetByName("CONFIG");
  var row = findRow_(sh, { 0: key });
  var lama = "";
  if (row > 0) { lama = sh.getRange(row, 2).getValue(); sh.getRange(row, 2).setValue(p.value); }
  else sh.appendRow([key, p.value]);
  log_(session, "updateConfig", key, lama, p.value);
  return { ok: true };
}

/** Ubah field metrik (bobot/target/aktif) berdasarkan id. */
function Admin_updateMetrik(p, session) {
  var id = String(p.id); if (!id) return { ok: false, error: "id wajib." };
  var sh = SpreadsheetApp.getActive().getSheetByName("METRIK");
  var row = findRow_(sh, { 0: id });
  if (row < 0) return { ok: false, error: "metrik tidak ditemukan: " + id };
  var map = { bobot: 6, target2026: 9, aktif: 11 };
  Object.keys(map).forEach(function (k) {
    if (p[k] !== undefined) { var col = map[k]; var lama = sh.getRange(row, col).getValue(); sh.getRange(row, col).setValue(p[k]); log_(session, "updateMetrik", id + "." + k, lama, p[k]); }
  });
  return { ok: true };
}

/** Kelola akun: op = add | disable | enable | delete. Sandi via setPassword() di editor. */
function Admin_account(p, session) {
  var sh = SpreadsheetApp.getActive().getSheetByName("AKUN");
  var u = String(p.username || "").trim(); if (!u) return { ok: false, error: "username wajib." };
  var row = findRow_(sh, { 0: u });
  switch (String(p.op)) {
    case "add":
      if (row > 0) return { ok: false, error: "username sudah ada." };
      sh.appendRow([u, "GANTI_LEWAT_setPassword", p.peran || "admin", p.nama || u, true]);
      break;
    case "disable": if (row > 0) sh.getRange(row, 5).setValue(false); break;
    case "enable": if (row > 0) sh.getRange(row, 5).setValue(true); break;
    case "delete": if (row > 0) sh.deleteRow(row); break;
    default: return { ok: false, error: "op tidak dikenal." };
  }
  log_(session, "account." + p.op, u, "", "");
  return { ok: true };
}

/** Kelola berita: op = add | delete. */
function Admin_berita(p, session) {
  var sh = SpreadsheetApp.getActive().getSheetByName("BERITA");
  if (String(p.op) === "add") {
    sh.appendRow([p.date || "", p.title || "", p.desc || "", p.kategori || "", p.url || "", true]);
  } else if (String(p.op) === "delete") {
    var row = findRow_(sh, { 1: p.title });
    if (row > 0) sh.deleteRow(row);
  } else return { ok: false, error: "op tidak dikenal." };
  log_(session, "berita." + p.op, p.title || "", "", "");
  return { ok: true };
}

/** Baca LOG audit (50 terbaru). */
function Admin_audit() {
  var rows = sheetRows_("LOG");
  return { ok: true, log: rows.slice(-50).reverse().map(function (r) {
    return { waktu: String(r[0]), user: String(r[1]), aksi: String(r[2]), param: String(r[3]), lama: String(r[4]), baru: String(r[5]) };
  }) };
}
