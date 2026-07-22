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

export function buildModel(s = seed) {
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
    dataAsOf: s.meta.dataAsOf,
  };

  return { months, metrics, series: { sum, total, byMonth }, lastIdx, forecast, contrib, categories, pillars, kpis, meta: s.meta };
}

function avgAch(ms, idx) {
  const vals = ms.map((m) => m.achievement?.[idx]).filter((v) => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export const model = buildModel();
