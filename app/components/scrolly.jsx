import { useRef } from "react";
import {
  motion, useScroll, useVelocity, useSpring, useTransform, useMotionValue, useAnimationFrame,
} from "motion/react";
import { pct, num } from "../lib/format.js";

const wrapVal = (min, max, v) => { const r = max - min; return ((((v - min) % r) + r) % r) + min; };

/* ---------- Velocity marquee: kecepatan ikut kecepatan scroll ---------- */
export function VelocityMarquee({ items, baseVelocity = 4 }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVel = useVelocity(scrollY);
  const smooth = useSpring(scrollVel, { damping: 50, stiffness: 400 });
  const factor = useTransform(smooth, [-1000, 0, 1000], [-3, 0, 3], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrapVal(-25, 0, v)}%`);
  const dir = useRef(1);
  useAnimationFrame((t, delta) => {
    let move = dir.current * baseVelocity * (delta / 1000);
    const f = factor.get();
    if (f < 0) dir.current = -1; else if (f > 0) dir.current = 1;
    move += dir.current * Math.abs(move) * Math.abs(f);
    baseX.set(baseX.get() + move);
  });
  const strip = items.concat(items, items, items);
  return (
    <div className="marquee" aria-hidden="true">
      <motion.div className="marquee-row" style={{ x }}>
        {strip.map((it, i) => (
          <span className="mq-item" key={i}>
            <span className="mq-dot" style={{ background: it.color }} />
            {it.value}<small>{it.label}</small>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ---------- Overlapping pillar stack ---------- */
export function PillarStack({ pillars }) {
  // Background OPAQUE (gradien tint di atas warna pekat) → tak tembus-pandang saat menumpuk.
  const bg = {
    E: "radial-gradient(130% 120% at 12% -12%, rgba(52,211,153,.22), transparent 56%), #0d1712",
    S: "radial-gradient(130% 120% at 88% -12%, rgba(125,211,252,.20), transparent 56%), #0b131c",
  };
  const brd = { E: "rgba(52,211,153,.28)", S: "rgba(125,211,252,.26)" };
  return (
    <section className="pillars wrap">
      {pillars.map((p) => (
        <PillarCard key={p.pilar} p={p} bg={bg[p.pilar]} brd={brd[p.pilar]} />
      ))}
    </section>
  );
}
function PillarCard({ p, bg, brd }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.93]);
  const opacity = useTransform(scrollYProgress, [0, 0.65, 1], [1, 1, 0.35]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -24]);
  const pilarPct = p.weight > 0 ? p.point / p.weight : null;
  return (
    <motion.div ref={ref} className="pillar-card" style={{ scale, opacity, y, background: bg, borderColor: brd, willChange: "transform, opacity" }}>
      <div className="eyebrow">Pilar {p.pilar}</div>
      <div className="pillar-big">{p.label}</div>
      <div style={{ display: "flex", gap: 40, marginTop: 18, flexWrap: "wrap" }}>
        <Stat k="Bobot pilar" v={pct(p.weight, 0)} />
        <Stat k="ESG Point (Jun)" v={pct(p.point)} />
        <Stat k="Rata-rata capaian" v={pct(pilarPct)} />
        <Stat k="Jumlah metrik" v={num(p.metrics.length)} />
      </div>
    </motion.div>
  );
}
function Stat({ k, v }) {
  return (<div><div className="muted" style={{ fontSize: 13 }}>{k}</div><div className="pillar-pct">{v}</div></div>);
}

/* ---------- Parallax storytelling per parameter ---------- */
export function StoryParallax({ panels }) {
  return (
    <section className="wrap">
      {panels.map((p, i) => (<StoryPanel key={p.id} p={p} flip={i % 2 === 1} />))}
    </section>
  );
}
function StoryPanel({ p }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const yBack = useTransform(scrollYProgress, [0, 1], [120, -120]);
  return (
    <div className="par" ref={ref}>
      <div>
        <div className="eyebrow">{p.kategori}</div>
        <h2 style={{ fontSize: "clamp(26px,4vw,44px)", margin: "6px 0 10px" }}>{p.name}</h2>
        <p className="muted" style={{ maxWidth: 460 }}>
          Target {num(p.target2026, p.target2026 < 10 ? 2 : 0)} {p.satuan} · capaian {pct(p.lastAch)} · kontribusi {pct(p.lastPoint)} ESG Point.
        </p>
      </div>
      <div className="par-visual" style={{ position: "relative", overflow: "hidden" }}>
        <motion.div style={{ y: yBack, position: "absolute", fontSize: 150, fontWeight: 800, color: "var(--glass-brd)" }}>{Math.round((p.lastAch || 0) * 100)}</motion.div>
        <motion.div style={{ y, fontSize: "clamp(40px,8vw,80px)", fontWeight: 700, color: "var(--mint)" }}>{pct(p.lastAch)}</motion.div>
      </div>
    </div>
  );
}
