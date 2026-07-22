// Membangun view-model dashboard dari seed + esg-engine (satu sumber rumus Fase 1).
import seed from "../../data/seed-esg.json";
import * as E from "../../engine/esg-engine.js";

export const CATEGORY_ORDER = [
  "Energi & Emisi",
  "Energi Terbarukan",
  "Air",
  "Limbah",
  "K3 (LTI-FR)",
  "Community Development",
];

// Peta metrik → SDG & GRI (badge keselarasan; dari riset framework grup)
export const FRAMEWORK = {
  ghg_int: { sdg: "SDG 13", gri: "GRI 305" },
  fuel_ratio: { sdg: "SDG 13", gri: "GRI 302" },
  renewable: { sdg: "SDG 7", gri: "GRI 302" },
  water_int: { sdg: "SDG 6", gri: "GRI 303" },
  air_bersih: { sdg: "SDG 6", gri: "GRI 303" },
  air_konservasi: { sdg: "SDG 6", gri: "GRI 303" },
  flowmeter: { sdg: "SDG 6", gri: "GRI 303" },
  waste_diverted: { sdg: "SDG 12", gri: "GRI 306" },
  limbah_b3: { sdg: "SDG 12", gri: "GRI 306" },
  limbah_domestik: { sdg: "SDG 12", gri: "GRI 306" },
  limbah_produksi: { sdg: "SDG 12", gri: "GRI 306" },
  ltifr: { sdg: "SDG 8", gri: "GRI 403" },
  comdev: { sdg: "SDG 1", gri: "GRI 413" },
};

// Timpa data dengan input bulanan dari website (CONFIG.esgdata) — tanpa mengubah seed asli.
function applyEsgdata(s) {
  const config = s.config || {};
  let ed = {};
  try { ed = JSON.parse(config.esgdata || "{}"); } catch (_) { return s; }
  if (!ed || !Object.keys(ed).length) return s;
  const data = {};
  for (const k in s.data) data[k] = { aktual: (s.data[k].aktual || []).slice(), achievement: (s.data[k].achievement || []).slice() };
  for (const mid in ed) {
    if (!data[mid]) data[mid] = { aktual: Array(12).fill(null), achievement: Array(12).fill(null) };
    for (const mo in ed[mid]) {
      const i = Number(mo) - 1; if (i < 0 || i > 11) continue;
      const e = ed[mid][mo] || {};
      if (e.aktual != null) data[mid].aktual[i] = e.aktual;
      if (e.achievement != null) data[mid].achievement[i] = e.achievement;
    }
  }
  return { ...s, data };
}

export function buildModel(s = seed) {
  s = applyEsgdata(s);
  const months = s.months;
  const { sum, total, byMonth } = E.computeSeries(s);
  const lastIdx = E.lastValidIndex(total);
  // Forecast dibatasi ke plafon indeks (125%) & lantai 0 — indeks tak mungkin > cap.
  const cap = s.meta.cap;
  const clampArr = (a) => a.map((v) => (v == null ? null : Math.max(0, Math.min(v, cap))));
  const forecast = { linear: clampArr(E.linearForecast(total)), ma: clampArr(E.movingAverage(total)) };

  const metrics = s.metrics.map((m) => {
    const d = s.data[m.id] || {};
    const ach = d.achievement || [];
    const act = d.aktual || [];
    const points = ach.map((a) => E.metricPoint(m, a));
    return {
      ...m,
      framework: FRAMEWORK[m.id] || {},
      actual: act,
      achievement: ach,
      points,
      lastActual: act[lastIdx],
      lastAch: ach[lastIdx],
      lastPoint: points[lastIdx],
      rag: ach.map((a) => E.ragStatus(a)),
    };
  });

  const totalLast = total[lastIdx];
  const contrib = E.contribution(s, lastIdx);

  const categories = CATEGORY_ORDER.map((name) => {
    const ms = metrics.filter((m) => m.kategori === name);
    return {
      name,
      metrics: ms,
      weight: ms.reduce((a, m) => a + m.bobot, 0),
      point: ms.reduce((a, m) => a + (m.lastPoint || 0), 0),
      ach: avgAch(ms, lastIdx),
    };
  });

  const pillars = [
    { pilar: "E", label: "Environmental", metrics: metrics.filter((m) => m.pilar === "E") },
    { pilar: "S", label: "Social", metrics: metrics.filter((m) => m.pilar === "S") },
  ].map((p) => ({
    ...p,
    weight: p.metrics.reduce((a, m) => a + m.bobot, 0),
    point: p.metrics.reduce((a, m) => a + (m.lastPoint || 0), 0),
  }));

  const prev = lastIdx > 0 ? total[lastIdx - 1] : null;
  const kpis = {
    current: totalLast,
    ytd: totalLast,
    target: s.meta.target,
    cap: s.meta.cap,
    achievement: totalLast != null ? totalLast / s.meta.target : null,
    gap: totalLast != null ? totalLast - s.meta.target : null,
    momentum: prev != null && totalLast != null ? totalLast - prev : null,
    forecastYearEnd: forecast.linear[11],
    lastMonth: months[lastIdx],
    lastIdx,
    dataAsOf: periodLabel(s.meta.dataAsOf),
  };

  const berita = (s.berita || []).map((b) => ({ date: fmtYear(b.date), title: b.title, desc: b.desc, url: b.url }));

  // Galeri permanen dari CONFIG (key 'galeri' = JSON array). Fallback ke contoh bila kosong.
  const config = s.config || {};
  let gallery = [];
  try { const g = JSON.parse(config.galeri || "[]"); if (Array.isArray(g)) gallery = g; } catch (_) {}

  return { months, metrics, series: { sum, total, byMonth }, lastIdx, forecast, contrib, categories, pillars, kpis, meta: s.meta, berita, gallery, config };
}

export const DEFAULT_GALLERY = [
  { id: "g1", judul: "Reklamasi & lingkungan", kategori: "Lingkungan" },
  { id: "g2", judul: "K3 / keselamatan kerja", kategori: "Sosial" },
  { id: "g3", judul: "Community development", kategori: "Sosial" },
];

// Sheet kadang menyimpan tanggal sebagai ISO — ambil tahunnya saja untuk tampilan.
function fmtYear(v) {
  if (!v) return "";
  const m = String(v).match(/(\d{4})/);
  return m ? m[1] : String(v);
}

// "2026-06" atau ISO → "Jun 2026" (zona Jakarta).
export function periodLabel(v) {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, mo] = s.split("-").map(Number);
    return ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][mo - 1] + " " + y;
  }
  const d = new Date(s);
  if (!isNaN(d)) return d.toLocaleDateString("id-ID", { month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
  return s;
}

function avgAch(ms, idx) {
  const vals = ms.map((m) => m.achievement?.[idx]).filter((v) => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export const model = buildModel();
