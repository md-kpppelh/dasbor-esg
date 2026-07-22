/**
 * Api.gs — pembacaan data (publik) + helper baca sheet.
 * Bentuk output DISAMAKAN dengan data/seed-esg.json agar model React tinggal pakai.
 */

var MONTHS_ = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function Api_dashboard() {
  return {
    ok: true,
    months: MONTHS_,
    meta: readMeta_(),
    metrics: readMetrik_(),
    data: readData_(),
    config: readConfigObj_(),
    berita: readBerita_(),
  };
}

function sheetRows_(name) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) return [];
  var v = sh.getDataRange().getValues();
  return v.length > 1 ? v.slice(1) : [];
}

function readConfigObj_() {
  var o = {};
  sheetRows_("CONFIG").forEach(function (r) { if (r[0] !== "") o[String(r[0])] = r[1]; });
  return o;
}
function readMeta_() {
  var c = readConfigObj_();
  return {
    tahun: Number(c.tahun) || 2026,
    target: Number(c.target_komposit) || 1.0,
    cap: Number(c.cap) || 1.25,
    dataAsOf: c.data_as_of || "",
    judul: c.judul || "Dashboard ESG",
  };
}

function readMetrik_() {
  return sheetRows_("METRIK").filter(function (r) { return r[0] !== ""; }).map(function (r) {
    return {
      id: String(r[0]), no: Number(r[1]), name: String(r[2]), kategori: String(r[3]),
      pilar: String(r[4]), bobot: Number(r[5]) || 0, satuan: String(r[6]), arah: String(r[7]),
      target2026: r[8] === "" ? null : Number(r[8]), rumus: String(r[9]),
      aktif: String(r[10]).toLowerCase() !== "false",
    };
  });
}

/** DATA long → { param: { aktual:[12], achievement:[12] } } */
function readData_() {
  var out = {};
  var blank = function () { return { aktual: newArr_(), achievement: newArr_() }; };
  sheetRows_("DATA").forEach(function (r) {
    var pid = String(r[0]); if (!pid) return;
    var bulan = Number(r[2]); if (!(bulan >= 1 && bulan <= 12)) return;
    var field = String(r[3]);
    if (!out[pid]) out[pid] = blank();
    if (out[pid][field]) out[pid][field][bulan - 1] = r[4] === "" ? null : Number(r[4]);
  });
  return out;
}
function newArr_() { return [null, null, null, null, null, null, null, null, null, null, null, null]; }

function readBerita_() {
  return sheetRows_("BERITA")
    .filter(function (r) { return r[1] !== "" && String(r[5]).toLowerCase() !== "false"; })
    .map(function (r) {
      return { date: String(r[0]), title: String(r[1]), desc: String(r[2]), kategori: String(r[3]), url: String(r[4]) };
    });
}
