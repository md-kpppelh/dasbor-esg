import { useState, Fragment } from "react";
import { pct, ragColor } from "../lib/format.js";

/* ---------- Gauge setengah lingkaran (0..cap, tanda target) ---------- */
export function Gauge({ value, target = 1, cap = 1.25, label }) {
  const W = 260, H = 150, cx = W / 2, cy = 130, r = 104;
  const polar = (v) => {
    const a = (180 - (Math.min(v, cap) / cap) * 180) * (Math.PI / 180);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const arc = (v0, v1) => {
    const [x0, y0] = polar(v0), [x1, y1] = polar(v1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const [tx, ty] = polar(target);
  const col = value == null ? "var(--muted)" : value >= target ? "var(--rag-green)" : value >= target * 0.9 ? "var(--rag-yellow)" : "var(--rag-red)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Gauge ${pct(value)}`}>
      <path d={arc(0, cap)} stroke="var(--grid-line)" strokeWidth="14" fill="none" strokeLinecap="round" />
      {value != null && <path d={arc(0, value)} stroke={col} strokeWidth="14" fill="none" strokeLinecap="round" />}
      <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="var(--ink)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="5" fill="var(--ink)" />
      <text x={cx} y={cy - 34} textAnchor="middle" fontSize="34" fontWeight="700" fill="var(--ink)">{pct(value)}</text>
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize="12" fill="var(--ink-2)">{label || `target ${pct(target, 0)}`}</text>
    </svg>
  );
}

/* ---------- Line chart bulanan: actual + forecast + target ---------- */
export function TrendChart({ months, actual, forecast, target = 1, ymax = 1.3, height = 260 }) {
  const W = 720, H = height, pL = 40, pR = 16, pT = 16, pB = 26;
  const iw = W - pL - pR, ih = H - pT - pB;
  const x = (i) => pL + (i / (months.length - 1)) * iw;
  const y = (v) => pT + ih - (v / ymax) * ih;
  const path = (arr) => arr.map((v, i) => (v == null ? null : `${i === 0 || arr[i - 1] == null ? "M" : "L"} ${x(i)} ${y(v)}`)).filter(Boolean).join(" ");
  const lastReal = actual.reduce((acc, v, i) => (v != null ? i : acc), 0);
  const fc = forecast.map((v, i) => (i >= lastReal ? v : null));
  const grid = [0.5, target, 1.25].filter((g) => g <= ymax);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Tren pencapaian ESG">
      {grid.map((g) => (
        <g key={g}>
          <line x1={pL} y1={y(g)} x2={W - pR} y2={y(g)} stroke="var(--grid-line)" strokeDasharray={g === target ? "0" : "3 4"} />
          <text x={4} y={y(g) + 4} fontSize="10" fill="var(--ink-2)">{pct(g, 0)}</text>
        </g>
      ))}
      {months.map((m, i) => (<text key={m} x={x(i)} y={H - 8} fontSize="10" fill="var(--ink-2)" textAnchor="middle">{m}</text>))}
      <path d={path(fc)} stroke="var(--mint)" strokeWidth="2" fill="none" strokeDasharray="5 5" />
      <path d={path(actual)} stroke="var(--brand)" strokeWidth="2.5" fill="none" />
      {actual.map((v, i) => v != null && <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--brand)" />)}
    </svg>
  );
}

/* ---------- Waterfall kontribusi metrik ke total ---------- */
export function Waterfall({ items, total, ymax = 1.25, height = 240 }) {
  const W = 720, H = height, pL = 34, pR = 10, pT = 12, pB = 64;
  const iw = W - pL - pR, ih = H - pT - pB;
  const bw = iw / items.length * 0.62, gap = iw / items.length;
  const y = (v) => pT + ih - (v / ymax) * ih;
  let cum = 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Waterfall kontribusi">
      <line x1={pL} y1={y(1)} x2={W - pR} y2={y(1)} stroke="var(--grid-line)" strokeDasharray="3 4" />
      <text x={4} y={y(1) + 4} fontSize="10" fill="var(--ink-2)">100%</text>
      {items.map((it, i) => {
        const x0 = pL + gap * i + (gap - bw) / 2;
        const h = (it.point / ymax) * ih;
        const yTop = y(cum + it.point);
        cum += it.point;
        return (
          <g key={it.id}>
            <rect x={x0} y={yTop} width={bw} height={h} rx="3" fill="var(--brand)" opacity={0.55 + 0.45 * (it.point / (items[0].point || 1))} />
            <text x={x0 + bw / 2} y={yTop - 4} fontSize="9" fill="var(--ink-2)" textAnchor="middle">{pct(it.point)}</text>
            <text x={x0 + bw / 2} y={H - pB + 12} fontSize="9" fill="var(--ink-2)" textAnchor="end" transform={`rotate(-35 ${x0 + bw / 2} ${H - pB + 12})`}>{it.short}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Sparkline kecil ---------- */
export function Sparkline({ data, ymax = 1.3, width = 130, height = 40, color = "var(--mint)" }) {
  const pts = data.map((v, i) => (v == null ? null : [(i / (data.length - 1)) * width, height - (v / ymax) * height]));
  const d = pts.map((p, i) => (p == null ? null : `${i === 0 || pts[i - 1] == null ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).filter(Boolean).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      <path d={d} stroke={color} strokeWidth="2" fill="none" />
    </svg>
  );
}

/* ---------- Heatmap 13 metrik x 12 bulan ---------- */
// Heatmap 6 kategori; klik kategori → buka/tutup sub-metrik (drop down).
export function Heatmap({ months, categories }) {
  const [open, setOpen] = useState({});
  const cols = `210px repeat(${months.length}, 1fr)`;
  const ragOf = (v) => (v == null ? "none" : v >= 1 ? "green" : v >= 0.9 ? "yellow" : "red");
  return (
    <div className="heat" style={{ gridTemplateColumns: cols }}>
      <div />
      {months.map((m) => (<div key={m} className="hhead">{m}</div>))}
      {categories.map((cat) => {
        const isOpen = !!open[cat.name];
        const monthly = months.map((_, i) => catAch_(cat.metrics, i));
        return (
          <Fragment key={cat.name}>
            <div className="hlabel hcat" onClick={() => setOpen((o) => ({ ...o, [cat.name]: !o[cat.name] }))} title="Klik untuk buka/tutup sub-metrik">
              <span className="hcaret">{isOpen ? "▾" : "▸"}</span>{cat.name}
            </div>
            {monthly.map((v, i) => <HeatCell key={i} v={v} rag={ragOf(v)} name={cat.name} />)}
            {isOpen && cat.metrics.map((mt) => (
              <Fragment key={mt.id}>
                <div className="hlabel hsub" title={mt.name}>{mt.name}</div>
                {mt.rag.map((r, i) => <HeatCell key={i} v={mt.achievement[i]} rag={r} name={mt.name} />)}
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}
function HeatCell({ v, rag, name }) {
  return (
    <div className="hc" style={{ background: ragColor(rag), opacity: rag === "none" ? 0.18 : 1 }}
      title={`${name}: ${v != null ? pct(v) : "belum ada data"}`}>
      {v != null ? Math.round(v * 100) : ""}
    </div>
  );
}
// Capaian kategori per bulan = rata-rata tertimbang bobot sub-metrik.
function catAch_(metrics, i) {
  let w = 0, s = 0;
  for (const m of metrics) { const a = m.achievement[i]; if (a != null && m.bobot > 0) { w += m.bobot; s += m.bobot * a; } }
  return w > 0 ? s / w : null;
}
