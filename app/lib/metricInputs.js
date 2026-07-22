// Spesifikasi input mentah + rumus achievement tiap metrik (meniru Excel "Index ESG").
// Dipakai form Input Bulanan agar admin cukup isi angka mentah; website hitung achievement.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ok = (v) => (typeof v === "number" && isFinite(v) ? v : null);

// compute(raw, target, month) -> { aktual, ach }  (null bila input tak lengkap)
export const METRIC_INPUTS = {
  ghg_int: {
    fields: [{ k: "reduksi", label: "% Reduksi Intensitas GHG YTD", pct: true }],
    compute: (r, t) => ({ aktual: ok(r.reduksi), ach: r.reduksi == null ? null : clamp(r.reduksi / t, 0, 1.25) }),
  },
  fuel_ratio: {
    fields: [{ k: "fuel", label: "Fuel usage YTD (liter)" }, { k: "prod", label: "Produksi YTD (bcm)" }],
    compute: (r, t) => { const a = r.fuel / r.prod; return { aktual: ok(a), ach: ok(a) == null ? null : clamp(1 + 1 - a / t, 0, 1) }; },
  },
  renewable: {
    fields: [{ k: "re", label: "Energi terbarukan (GJ)" }, { k: "nonre", label: "Energi tak terbarukan (GJ)" }],
    compute: (r, t) => { const a = r.re / (r.re + r.nonre); return { aktual: ok(a), ach: ok(a) == null ? null : clamp(a / t, 0, 1.25) }; },
  },
  water_int: {
    fields: [{ k: "reduksi", label: "% Reduksi Intensitas Air YTD", pct: true }],
    compute: (r, t) => ({ aktual: ok(r.reduksi), ach: r.reduksi == null ? null : clamp(r.reduksi / t, 0, 1.25) }),
  },
  air_bersih: {
    fields: [{ k: "v", label: "Pemakaian air bersih (m³/orang/hari)" }],
    compute: (r, t) => ({ aktual: ok(r.v), ach: r.v == null ? null : clamp(1 + 1 - r.v / t, 0, 1) }),
  },
  air_konservasi: {
    fields: [{ k: "v", label: "% Pemanfaatan air konservasi", pct: true }],
    compute: (r, t) => ({ aktual: ok(r.v), ach: r.v == null ? null : clamp(r.v / t, 0, 1) }),
  },
  flowmeter: {
    fields: [{ k: "v", label: "% Pemenuhan flowmeter", pct: true }],
    compute: (r, t) => ({ aktual: ok(r.v), ach: r.v == null ? null : clamp(r.v / t, 0, 1) }),
  },
  waste_diverted: {
    fields: [{ k: "div", label: "Waste diverted (ton)" }, { k: "disp", label: "Waste disposed (ton)" }],
    compute: (r, t) => { const a = r.div / (r.div + r.disp); return { aktual: ok(a), ach: ok(a) == null ? null : clamp(a / t, 0, 1.25) }; },
  },
  limbah_b3: {
    fields: [{ k: "t", label: "Limbah B3 terolah (ton)" }, { k: "tot", label: "Total timbulan B3 (ton)" }],
    compute: (r, t) => { const a = r.t / r.tot; return { aktual: ok(a), ach: ok(a) == null ? null : clamp(a / t, 0, 1) }; },
  },
  limbah_domestik: {
    fields: [{ k: "t", label: "Limbah domestik terolah (ton)" }, { k: "tot", label: "Total timbulan domestik (ton)" }],
    compute: (r, t) => { const a = r.t / r.tot; return { aktual: ok(a), ach: ok(a) == null ? null : clamp(a / t, 0, 1) }; },
  },
  limbah_produksi: {
    fields: [{ k: "t", label: "Limbah produksi terolah (ton)" }, { k: "tot", label: "Total timbulan produksi (ton)" }],
    compute: (r, t) => { const a = r.t / r.tot; return { aktual: ok(a), ach: ok(a) == null ? null : clamp(a / t, 0, 1) }; },
  },
  ltifr: {
    fields: [
      { k: "lti", label: "Jumlah korban LTI" }, { k: "fat", label: "Jumlah fatality" },
      { k: "emp", label: "Jumlah karyawan" }, { k: "hours", label: "Rata² jam kerja/karyawan/thn" },
    ],
    compute: (r) => { const th = r.emp * r.hours; const lf = th > 0 ? (r.fat + r.lti) * 1e6 / th : 0; return { aktual: ok(lf), ach: ok(lf) == null ? null : clamp(1 + 1 - lf / 0.001, 0, 1.25) }; },
  },
  comdev: {
    fields: [{ k: "benef", label: "Jumlah penerima manfaat (kumulatif)" }],
    compute: (r, t, month) => { const mt = (t * month) / 12; return { aktual: ok(r.benef), ach: r.benef == null || mt <= 0 ? null : clamp(r.benef / mt, 0, 1.25) }; },
  },
};

// Ambil nilai numerik dari raw; kosong -> null (bukan 0).
export function computeMetric(metric, raw, month) {
  const spec = METRIC_INPUTS[metric.id];
  if (!spec) return null;
  const r = {};
  let anyFilled = false;
  for (const f of spec.fields) {
    const val = raw[f.k];
    if (val === "" || val == null) { r[f.k] = null; }
    else { let n = Number(val); if (f.pct) n = n / 100; r[f.k] = n; anyFilled = true; }
  }
  if (!anyFilled) return null;
  const out = spec.compute(r, metric.target2026, month);
  return out;
}
