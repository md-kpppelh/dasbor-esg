import { useState, useEffect } from "react";
import { Gauge, TrendChart, Heatmap } from "./charts.jsx";
import { buildInsights } from "../lib/insights.js";
import { pct, signedPct } from "../lib/format.js";

/* Mode TV/Kiosk — adegan berputar otomatis, huruf besar, tanpa blur (anti-freeze). */
export default function TVMode({ model, onExit }) {
  const { months, kpis, series, forecast, lastIdx } = model;
  const total = series.total[lastIdx];
  const insights = buildInsights(model);
  const cats = model.categories;
  const maxPoint = Math.max(...cats.map((c) => c.point || 0), 0.001);

  const scenes = [
    () => (
      <div style={{ textAlign: "center" }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>ESG Index YTD {months[lastIdx]} 2026 · PELH</div>
        <div className="tv-big">{pct(total)}</div>
        <div style={{ maxWidth: 620, margin: "24px auto 0" }}><Gauge value={total} target={kpis.target} cap={kpis.cap} /></div>
        <div style={{ display: "flex", gap: 48, justifyContent: "center", marginTop: 20, fontFamily: "var(--font-mono)", fontSize: 18 }}>
          <span className="muted">Target <b style={{ color: "var(--ink)" }}>{pct(kpis.target, 0)}</b></span>
          <span className="muted">Achv <b style={{ color: total >= kpis.target ? "var(--rag-green)" : "var(--rag-red)" }}>{pct(kpis.achievement)}</b></span>
          <span className="muted">Forecast Des <b style={{ color: "var(--ink)" }}>{pct(kpis.forecastYearEnd)}</b></span>
          <span className="muted">Momentum <b style={{ color: kpis.momentum >= 0 ? "var(--rag-green)" : "var(--rag-red)" }}>{signedPct(kpis.momentum)}</b></span>
        </div>
      </div>
    ),
    () => (
      <div>
        <div className="tv-h">Tren Pencapaian ESG 2026</div>
        <TrendChart months={months} actual={series.total} forecast={forecast.linear} yoy={model.yoy2025} target={kpis.target} height={360} />
      </div>
    ),
    () => (
      <div>
        <div className="tv-h">Kontribusi ke Skor · per Kategori</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {cats.map((c) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 260, fontFamily: "var(--font-mono)", fontSize: 18 }}>{c.name}</div>
              <div style={{ flex: 1, height: 22, background: "var(--grid-line)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: (100 * (c.point || 0) / maxPoint) + "%", background: "var(--accent)" }} />
              </div>
              <div style={{ width: 90, textAlign: "right", fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600 }}>{pct(c.point)}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    () => (
      <div>
        <div className="tv-h">Heatmap Pencapaian per Bulan</div>
        <div style={{ overflowX: "auto" }}><Heatmap months={months} categories={cats} /></div>
      </div>
    ),
    () => (
      <div>
        <div className="tv-h">Insight &amp; Perhatian</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {insights.map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", fontFamily: "var(--font-mono)", fontSize: 20 }}>
              <span style={{ color: it.tone === "risk" || it.tone === "warn" ? "var(--rag-yellow)" : it.tone === "action" ? "var(--mint)" : "var(--rag-green)" }}>{it.icon}</span>
              <span>{it.text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  ];

  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % scenes.length), 9000);
    const esc = (e) => { if (e.key === "Escape") onExit(); };
    window.addEventListener("keydown", esc);
    return () => { clearInterval(t); window.removeEventListener("keydown", esc); };
  }, []);

  return (
    <div className="tv-overlay">
      <div className="tv-top">
        <span>DASBORT · ESG — PELH 2026</span>
        <span style={{ cursor: "pointer" }} onClick={onExit}>Keluar (Esc) ✕</span>
      </div>
      <div className="tv-scene tv-fade" key={i}>{scenes[i]()}</div>
      <div className="tv-dots">{scenes.map((_, k) => <i key={k} className={k === i ? "on" : ""} />)}</div>
    </div>
  );
}
