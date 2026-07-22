import { useMemo, useState } from "react";
import { Gauge, TrendChart, Waterfall, Heatmap, Sparkline } from "./charts.jsx";
import { buildInsights } from "../lib/insights.js";
import { pct, num, signedPct, ragColor, ragLabel } from "../lib/format.js";
import { CountUp, Reveal } from "../lib/anim.jsx";
import { CATEGORY_ORDER } from "../lib/model.js";

const SHORT = {
  fuel_ratio: "Fuel", renewable: "Renew", air_bersih: "Air Bersih", air_konservasi: "Konservasi",
  flowmeter: "Flowmeter", limbah_b3: "B3", limbah_domestik: "Domestik", limbah_produksi: "Produksi",
  ltifr: "LTI-FR", comdev: "ComDev", ghg_int: "GHG", water_int: "Air-Int", waste_diverted: "Waste",
};

export default function Dashboard({ model, news }) {
  const { months, metrics, series, kpis, forecast, lastIdx } = model;
  const [idx, setIdx] = useState(lastIdx);
  const [mode, setMode] = useState("manajemen"); // manajemen | audit
  const [kategori, setKategori] = useState("all");

  const totalIdx = series.total[idx];
  const momentum = idx > 0 && totalIdx != null && series.total[idx - 1] != null ? totalIdx - series.total[idx - 1] : null;
  const alerts = metrics.filter((m) => m.bobot > 0 && m.achievement[idx] != null && m.achievement[idx] < 1).sort((a, b) => a.achievement[idx] - b.achievement[idx]);
  const forecastRisk = kpis.forecastYearEnd != null && kpis.forecastYearEnd < kpis.target;

  const contrib = useMemo(() => {
    const rows = metrics.map((m) => ({ id: m.id, name: m.name, short: SHORT[m.id] || m.name, point: m.points[idx] }));
    const sum = rows.reduce((a, r) => a + (r.point || 0), 0);
    return rows.map((r) => ({ ...r, share: r.point != null && sum > 0 ? r.point / sum : null }));
  }, [metrics, idx]);

  const insights = useMemo(() => buildInsights(model), [model]);
  const wfItems = contrib.filter((c) => c.point > 0).sort((a, b) => b.point - a.point);
  const shownMetrics = kategori === "all" ? metrics : metrics.filter((m) => m.kategori === kategori);
  const kpiList = [
    { lbl: "ESG Point Bulan Berjalan", to: totalIdx, fmt: (v) => pct(v), sub: months[idx] + " 2026" },
    { lbl: "ESG Point YTD", to: totalIdx, fmt: (v) => pct(v), sub: "s/d " + months[idx] },
    { lbl: "Target Tahunan", to: kpis.target, fmt: (v) => pct(v, 0), sub: "plafon " + pct(kpis.cap, 0) },
    { lbl: "Achievement vs Target", to: totalIdx != null ? totalIdx / kpis.target : null, fmt: (v) => pct(v), sub: months[idx], tone: totalIdx >= kpis.target ? "pos" : "neg" },
    { lbl: "Gap vs Target", to: totalIdx != null ? totalIdx - kpis.target : null, fmt: (v) => signedPct(v), sub: totalIdx >= kpis.target ? "melampaui" : "kurang", tone: totalIdx >= kpis.target ? "pos" : "neg" },
    { lbl: "Forecast Akhir Tahun", to: kpis.forecastYearEnd, fmt: (v) => pct(v), sub: "Des (linear)", tone: kpis.forecastYearEnd >= kpis.target ? "pos" : "neg" },
  ];

  return (
    <div className="dash wrap" id="dashboard">
      <div className="sec">
        <div className="eyebrow">Ringkasan Eksekutif</div>
        <h2 className="sec-title">Dashboard ESG PELH 2026</h2>
        <p className="sec-sub">Data per {kpis.dataAsOf} · sumber terkunci ke formula Index ESG (Jun {pct(series.total[lastIdx])}).</p>
      </div>

      {(alerts.length > 0 || forecastRisk) && (
        <div className="alert-banner">
          <span className="alert-dot" />
          <div>
            {alerts.length > 0 && <span><b>{alerts.length} parameter di bawah target</b> — {alerts.slice(0, 3).map((m) => `${m.name} (${pct(m.achievement[idx])})`).join(", ")}{alerts.length > 3 ? ", …" : ""}. </span>}
            {forecastRisk && <span>Forecast akhir tahun <b>{pct(kpis.forecastYearEnd)}</b> di bawah target {pct(kpis.target)}.</span>}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters card" style={{ padding: "12px 14px", marginBottom: 16 }}>
        <span className="muted" style={{ fontWeight: 600, fontSize: 13 }}>Filter</span>
        <select value={2026} disabled><option>2026</option></select>
        <select value={idx} onChange={(e) => setIdx(+e.target.value)}>
          {months.map((m, i) => (<option key={m} value={i} disabled={series.total[i] == null && i > lastIdx}>{m}</option>))}
        </select>
        <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
          <option value="all">Semua Kategori</option>
          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ marginLeft: "auto" }} className="muted" />
        <div className="seg">
          {["manajemen", "audit"].map((v) => (
            <button key={v} aria-pressed={mode === v} onClick={() => setMode(v)}>{v === "manajemen" ? "Manajemen" : "Audit"}</button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <Reveal className="grid g-kpi">
        {kpiList.map((k) => (
          <div className="kpi card" key={k.lbl}>
            <div className="lbl">{k.lbl}</div>
            <div className={"val " + (k.tone || "")}><CountUp to={k.to} fmt={k.fmt} duration={1.0} /></div>
            <div className="sub">{k.sub}</div>
          </div>
        ))}
      </Reveal>

      {/* Trend + Gauge */}
      <div className="grid g-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 16 }}>ESG Achievement Trend</h3>
          <p className="sec-sub">Actual (garis penuh) · Forecast (putus-putus) · Target 100%{model.yoy2025 ? " · 2025 (titik-titik abu)" : ""}.</p>
          <TrendChart months={months} actual={series.total} forecast={forecast.linear} yoy={model.yoy2025} target={kpis.target} />
        </div>
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h3 style={{ fontSize: 16 }}>Index {months[idx]}</h3>
          <Gauge value={totalIdx} target={kpis.target} cap={kpis.cap} />
          <div style={{ textAlign: "center" }} className="sub">
            Momentum: <b className={momentum >= 0 ? "pos" : "neg"}>{signedPct(momentum)}</b> vs bulan lalu
          </div>
        </div>
      </div>

      {/* Scoring + Waterfall */}
      <div className="sec"><h2 className="sec-title">ESG Scoring</h2>
        <p className="sec-sub">{mode === "manajemen" ? "Tampilan 6 kategori headline." : "Tampilan audit — 13 baris scoring berbobot."}</p></div>
      <div className="grid g-2">
        <div className="card scroll-x">
          <ScoringTable model={model} idx={idx} mode={mode} contrib={contrib} />
        </div>
        <div className="card">
          <h3 style={{ fontSize: 16 }}>Kontribusi ke Skor (Waterfall)</h3>
          <Waterfall items={wfItems} total={totalIdx} cap={kpis.cap} />
        </div>
      </div>

      {/* Heatmap */}
      <div className="sec"><h2 className="sec-title">ESG Heatmap</h2>
        <p className="sec-sub">Pencapaian tiap metrik per bulan · hijau ≥100% · kuning 90–99% · merah &lt;90%.</p></div>
      <div className="card scroll-x"><Heatmap months={months} categories={model.categories} /></div>

      {/* Insight + News */}
      <div className="grid g-2" style={{ marginTop: 24 }}>
        <div className="card">
          <h3 style={{ fontSize: 16 }}>Insight Otomatis</h3>
          {insights.map((it, i) => (
            <div className={"ins " + it.tone} key={i}><div className="ic">{it.icon}</div><div>{it.text}</div></div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 16 }}>Berita &amp; Penghargaan ESG</h3>
          {news.map((n, i) => (
            <div className="news-item" key={i}>
              <div className="news-date">{n.date}</div>
              <div><b>{n.title}</b><div className="muted" style={{ fontSize: 13 }}>{n.desc}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Parameter panels */}
      <div className="sec"><h2 className="sec-title">Parameter ESG</h2>
        <p className="sec-sub">{kategori === "all" ? "Enam kategori ESG." : kategori}</p></div>
      <div className="grid g-3">
        {CATEGORY_ORDER.filter((c) => shownMetrics.some((m) => m.kategori === c)).map((cat) => (
          <ParamCard key={cat} cat={cat} metrics={shownMetrics.filter((m) => m.kategori === cat)} idx={idx} months={months} />
        ))}
      </div>

      <footer className="wrap">
        Dasbort ESG · PELH 2026 · KPP–PAMA–United Tractors. Data per {kpis.dataAsOf}. Angka mengikuti formula Index ESG resmi.
      </footer>
    </div>
  );
}

function ScoringTable({ model, idx, mode, contrib }) {
  const { metrics } = model;
  const shareOf = (id) => contrib.find((c) => c.id === id)?.share;
  let rows;
  if (mode === "audit") {
    rows = metrics.map((m) => ({ name: m.name, weight: m.bobot, ach: m.achievement[idx], point: m.points[idx], share: shareOf(m.id) }));
  } else {
    rows = CATEGORY_ORDER.map((cat) => {
      const ms = metrics.filter((m) => m.kategori === cat);
      const weight = ms.reduce((a, m) => a + m.bobot, 0);
      const point = ms.reduce((a, m) => a + (m.points[idx] || 0), 0);
      const avg = ms.map((m) => m.achievement[idx]).filter((v) => v != null);
      return { name: cat, weight, ach: avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length : null, point, share: null };
    });
  }
  const totalPoint = rows.reduce((a, r) => a + (r.point || 0), 0);
  return (
    <table className="scoring">
      <thead><tr><th>Parameter</th><th>Bobot</th><th>Achv</th><th>Point</th><th>Kontribusi</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td>{pct(r.weight, 0)}</td>
            <td style={{ color: r.ach >= 1 ? "var(--rag-green)" : r.ach >= 0.9 ? "var(--rag-yellow)" : r.ach != null ? "var(--rag-red)" : "var(--muted)" }}>{pct(r.ach)}</td>
            <td>{pct(r.point)}</td>
            <td>{r.share != null ? pct(r.share) : (totalPoint > 0 ? pct((r.point || 0) / totalPoint) : "–")}</td>
          </tr>
        ))}
        <tr className="total"><td>TOTAL YTD</td><td>100%</td><td>–</td><td>{pct(totalPoint)}</td><td>100%</td></tr>
      </tbody>
    </table>
  );
}

function ParamCard({ cat, metrics, idx, months }) {
  const weight = metrics.reduce((a, m) => a + m.bobot, 0);
  const point = metrics.reduce((a, m) => a + (m.points[idx] || 0), 0);
  const lead = metrics.slice().sort((a, b) => b.bobot - a.bobot)[0];
  const ach = lead.achievement[idx];
  const isLti = cat.includes("LTI");
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 15 }}>{cat}</h3>
        <span className="chip" style={{ color: ragColor(lead.rag[idx]) }}>{ragLabel(lead.rag[idx])}</span>
      </div>
      <div style={{ display: "flex", gap: 6, margin: "8px 0" }}>
        {lead.framework.sdg && <span className="chip chip-sdg">{lead.framework.sdg}</span>}
        {lead.framework.gri && <span className="chip chip-gri">{lead.framework.gri}</span>}
        <span className="chip">Bobot {pct(weight, 0)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="muted" style={{ fontSize: 12 }}>Achievement ({lead.name.length > 16 ? lead.name.slice(0, 15) + "…" : lead.name})</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{pct(ach)}</div>
          <div className="muted" style={{ fontSize: 12 }}>Target {num(lead.target2026, lead.target2026 < 10 ? 2 : 0)} {lead.satuan} · Point {pct(point)}</div>
        </div>
        {isLti
          ? <TrafficLight rag={lead.rag[idx]} />
          : <Sparkline data={lead.achievement} color={ragColor(lead.rag[idx])} />}
      </div>
    </div>
  );
}

function TrafficLight({ rag }) {
  return (
    <div className="tl" aria-label={`status ${rag}`}>
      <i className={rag === "red" ? "on" : ""} style={{ background: "var(--rag-red)" }} />
      <i className={rag === "yellow" ? "on" : ""} style={{ background: "var(--rag-yellow)" }} />
      <i className={rag === "green" ? "on" : ""} style={{ background: "var(--rag-green)" }} />
    </div>
  );
}
