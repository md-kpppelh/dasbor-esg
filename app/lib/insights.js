// Insight otomatis (Fase 3) — narasi & rekomendasi dari view-model.
import { pct } from "./format.js";

export function buildInsights(model) {
  const out = [];
  const { metrics, kpis, contrib, series, lastIdx, forecast } = model;

  // 1) Kontributor terbesar
  const withShare = contrib.filter((c) => c.share != null).sort((a, b) => b.share - a.share);
  if (withShare[0]) {
    const top = withShare[0];
    out.push({
      tone: "good",
      icon: "▲",
      text: `${top.name} menyumbang ${pct(top.share)} dari total ESG Point — kontribusi terbesar.`,
    });
  }

  // 2) Di bawah target (metrik berbobot, achievement < 100%)
  const below = metrics
    .filter((m) => m.bobot > 0 && m.lastAch != null && m.lastAch < 1)
    .sort((a, b) => a.lastAch - b.lastAch);
  if (below.length) {
    const names = below.slice(0, 3).map((m) => `${m.name} (${pct(m.lastAch)})`).join(", ");
    out.push({
      tone: "warn",
      icon: "!",
      text: `${below.length} parameter berbobot di bawah target: ${names}.`,
    });
  } else {
    out.push({ tone: "good", icon: "✓", text: "Semua parameter berbobot mencapai/melampaui target." });
  }

  // 3) Momentum bulan berjalan
  if (kpis.momentum != null) {
    const naik = kpis.momentum >= 0;
    out.push({
      tone: naik ? "good" : "warn",
      icon: naik ? "▲" : "▼",
      text: `Index ${naik ? "naik" : "turun"} ${pct(Math.abs(kpis.momentum))} dibanding bulan sebelumnya (kini ${pct(kpis.current)}).`,
    });
  }

  // 4) Risiko / proyeksi akhir tahun
  const yearEnd = forecast.linear[11];
  if (yearEnd != null) {
    const aman = yearEnd >= kpis.target;
    out.push({
      tone: aman ? "good" : "risk",
      icon: aman ? "◎" : "⚠",
      text: aman
        ? `Forecast akhir tahun ${pct(yearEnd)} — di atas target ${pct(kpis.target)} (on-track).`
        : `Forecast akhir tahun ${pct(yearEnd)} — di bawah target ${pct(kpis.target)}. Perlu perbaikan.`,
    });
  }

  // 5) Rekomendasi tindakan (metrik berbobot terlemah)
  if (below[0]) {
    const m = below[0];
    const potensi = m.bobot * (1 - m.lastAch);
    out.push({
      tone: "action",
      icon: "→",
      text: `Fokus perbaikan pada ${m.name}: menutup gap ke 100% menambah hingga ${pct(potensi)} ESG Point (bobot ${pct(m.bobot, 0)}).`,
    });
  }

  return out;
}
