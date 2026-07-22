/**
 * esg-engine.js — mesin perhitungan ESG PELH 2026 (satu-satunya sumber rumus).
 *
 * Meniru sheet "Index ESG" master:
 *   %Achievement per metrik  -> Layer 1 (metricAchievement)
 *   Point = bobot x %Ach     -> Layer 2 (metricPoint / computeMonth)
 *   Total bulan = SUM(point), lalu di-cap 125% (YTD POINT TOTAL, baris 52)
 *
 * Modul ES murni — dipakai sama persis di React (Vite) maupun Node (uji paritas).
 * Tidak ada I/O, tidak ada dependensi. Aman di-deploy di akun mana pun.
 */

export const DEFAULT_CAP = 1.25;   // plafon 125%
export const DEFAULT_TARGET = 1.0; // target komposit 100%

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Layer 1 — %Achievement satu metrik dari nilai aktual + target.
 * Mengembalikan null bila rumus 'direct'/'ltifr' (achievement dipasok apa adanya),
 * atau bila input tak lengkap.
 * @param {object} metric  {rumus, target2026, ...}
 * @param {number} actual
 * @param {object} [opts]  {target, cap}
 */
export function metricAchievement(metric, actual, opts = {}) {
  const t = opts.target ?? metric.target2026;
  const cap = opts.cap ?? DEFAULT_CAP;
  if (actual == null || t == null) return null;
  switch (metric.rumus) {
    case "ratio":            // makin besar makin baik: a/t, dibatasi [0..cap]
      return clamp(actual / t, 0, cap);
    case "fuel_inverse":     // Fuel Ratio (makin kecil makin baik): 1+1-(a/t), [0..1]
      return clamp(1 + 1 - actual / t, 0, 1);
    case "ratio_cumulative": // a/t dengan target kumulatif bulanan (target via opts.target)
      return clamp(actual / t, 0, cap);
    default:                 // 'direct' | 'ltifr' -> tak dihitung di sini
      return null;
  }
}

/** Layer 2 — point satu metrik = bobot x %Achievement. */
export function metricPoint(metric, achievement) {
  if (achievement == null) return null;
  return metric.bobot * achievement;
}

/**
 * Total satu bulan dari peta achievement { metricId: ach }.
 * Bila ada metrik BERBOBOT yang achievement-nya null -> bulan dianggap belum lengkap
 * (total = null), menghindari #DIV/0! bocor seperti di Excel.
 * @returns {{points:Object, sum:?number, total:?number, incomplete:boolean}}
 */
export function computeMonth(metrics, achByMetric, opts = {}) {
  const cap = opts.cap ?? DEFAULT_CAP;
  const points = {};
  let sum = 0;
  let incomplete = false;
  for (const m of metrics) {
    const a = achByMetric[m.id];
    if (a == null) {
      points[m.id] = null;
      if (m.bobot > 0) incomplete = true;
      continue;
    }
    const p = m.bobot * a;
    points[m.id] = p;
    sum += p;
  }
  if (incomplete) return { points, sum: null, total: null, incomplete: true };
  return { points, sum, total: Math.min(sum, cap), incomplete: false };
}

/**
 * Hitung seluruh bulan dari objek seed (memakai achievement tersimpan).
 * @returns {{sum:Array<?number>, total:Array<?number>, byMonth:Array}}
 */
export function computeSeries(seed, opts = {}) {
  const cap = seed?.meta?.cap ?? opts.cap ?? DEFAULT_CAP;
  const n = seed.months.length;
  const sum = [];
  const total = [];
  const byMonth = [];
  for (let i = 0; i < n; i++) {
    const ach = {};
    for (const m of seed.metrics) {
      ach[m.id] = seed.data[m.id]?.achievement?.[i] ?? null;
    }
    const r = computeMonth(seed.metrics, ach, { cap });
    sum.push(r.sum);
    total.push(r.total);
    byMonth.push(r);
  }
  return { sum, total, byMonth };
}

/**
 * Kontribusi tiap metrik ke skor total pada satu bulan (untuk waterfall/contribution).
 * @returns {Array<{id, name, point, share}>}
 */
export function contribution(seed, monthIdx) {
  const rows = [];
  let sum = 0;
  for (const m of seed.metrics) {
    const p = metricPoint(m, seed.data[m.id]?.achievement?.[monthIdx] ?? null);
    if (p != null) sum += p;
    rows.push({ id: m.id, name: m.name, point: p });
  }
  return rows.map((r) => ({
    ...r,
    share: r.point != null && sum > 0 ? r.point / sum : null,
  }));
}

/** Status RAG dari %achievement (default: >=100% hijau, 90-99% kuning, <90% merah). */
export function ragStatus(achPct, thr = { green: 1.0, yellow: 0.9 }) {
  if (achPct == null) return "none";
  if (achPct >= thr.green) return "green";
  if (achPct >= thr.yellow) return "yellow";
  return "red";
}

/** Indeks bulan terakhir yang punya total valid (mis. Juni). */
export function lastValidIndex(totalSeries) {
  for (let i = totalSeries.length - 1; i >= 0; i--) {
    if (totalSeries[i] != null) return i;
  }
  return -1;
}

/**
 * Forecast tren linear (least squares) atas titik non-null.
 * Mengisi indeks yang null dengan proyeksi; indeks berdata tetap apa adanya.
 * @returns {Array<number>}
 */
export function linearForecast(series) {
  const pts = [];
  series.forEach((v, i) => { if (v != null) pts.push([i, v]); });
  if (pts.length < 2) return series.map((v) => (v == null ? null : v));
  const n = pts.length;
  const sx = pts.reduce((a, [x]) => a + x, 0);
  const sy = pts.reduce((a, [, y]) => a + y, 0);
  const sxx = pts.reduce((a, [x]) => a + x * x, 0);
  const sxy = pts.reduce((a, [x, y]) => a + x * y, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return series.map((v, i) => (v != null ? v : slope * i + intercept));
}

/** Moving average (default jendela 3) atas titik non-null; mengisi indeks null. */
export function movingAverage(series, window = 3) {
  const out = series.slice();
  for (let i = 0; i < series.length; i++) {
    if (series[i] != null) continue;
    const prev = [];
    for (let j = i - 1; j >= 0 && prev.length < window; j--) {
      if (out[j] != null) prev.push(out[j]);
    }
    out[i] = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : null;
  }
  return out;
}

export default {
  metricAchievement,
  metricPoint,
  computeMonth,
  computeSeries,
  contribution,
  ragStatus,
  lastValidIndex,
  linearForecast,
  movingAverage,
  DEFAULT_CAP,
  DEFAULT_TARGET,
};
