import { motion } from "motion/react";
import { MediaSlot } from "../components/Media.jsx";
import { CountUp, STAGGER, ITEM } from "../lib/anim.jsx";
import { pct } from "../lib/format.js";

/* Hero editorial (referensi produx.design): tipografi raksasa + label mono + blok media, entrance stagger. */
export default function Hero({ model }) {
  const idx = model.lastIdx;
  const E = model.pillars.find((p) => p.pilar === "E");
  const S = model.pillars.find((p) => p.pilar === "S");
  return (
    <section className="hero wrap">
      <motion.div variants={STAGGER} initial="hidden" animate="show">
        <motion.div variants={ITEM} className="hero-eyebrow eyebrow">Executive ESG Monitoring — PELH 2026 · KPP · PAMA · United Tractors</motion.div>
        <motion.h1 variants={ITEM} className="hero-h">Dampak ESG,<br />terukur tiap bulan.<sup style={{ color: "var(--accent)", fontSize: ".38em", verticalAlign: "super" }}>®</sup></motion.h1>
        <motion.div variants={ITEM} className="hero-index"><CountUp to={model.series.total[idx]} fmt={(v) => pct(v)} duration={1.5} /></motion.div>
        <motion.div variants={ITEM} className="hero-sub">ESG Index YTD {model.months[idx]} 2026 — dua pilar Environmental &amp; Social menopang skor. Target 100%, plafon 125%.</motion.div>
        <motion.div variants={ITEM} className="hero-meta">
          <span>Lokasi <b>Lahat, Sumsel</b></span>
          <span>Site <b>PELH · open-pit</b></span>
          <span>Pilar E <b>{pct(E.weight, 0)}</b></span>
          <span>Pilar S <b>{pct(S.weight, 0)}</b></span>
          <span>Forecast Des <b>{pct(model.kpis.forecastYearEnd)}</b></span>
        </motion.div>
        <motion.div variants={ITEM} style={{ marginTop: 40 }}>
          <MediaSlot id="hero" label="Foto / video utama site PELH" tag="PELH · SITE" aspect="21 / 9" />
        </motion.div>
      </motion.div>
    </section>
  );
}
