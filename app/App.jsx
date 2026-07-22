import { useState, useEffect, useMemo } from "react";
import { buildModel, model as seedModel } from "./lib/model.js";
import { fetchDashboard } from "./lib/api.js";
import { API_URL } from "./lib/config.js";
import { pct, num } from "./lib/format.js";
import { useLenis, Reveal } from "./lib/anim.jsx";
import Hero from "./three/Hero.jsx";
import { MediaGallery } from "./components/Media.jsx";
import { VelocityMarquee, PillarStack, StoryParallax } from "./components/scrolly.jsx";
import Dashboard from "./components/Dashboard.jsx";

const STATIC_NEWS = [
  { date: "2025", title: "AREA 2025", desc: "Health Promotion & Investment in People — Asia Responsible Enterprise Awards." },
  { date: "2025", title: "HR Asia 2025", desc: "Best Companies to Work For in Asia." },
  { date: "2022", title: "ISDA 2022 — 7 penghargaan", desc: "Indonesian SDGs Award untuk program keberlanjutan." },
];

const GALLERY = [
  { id: "g1", label: "Reklamasi & lingkungan", tag: "ENVIRONMENTAL", aspect: "4 / 3" },
  { id: "g2", label: "K3 / keselamatan kerja", tag: "SOCIAL", aspect: "4 / 3" },
  { id: "g3", label: "Community development", tag: "SOCIAL", aspect: "4 / 3" },
];

function SectionHead({ n, title, sub }) {
  return (
    <Reveal className="sec">
      <span className="sec-num">{n}</span>
      <h2 className="sec-title">{title}</h2>
      <p className="sec-sub">{sub}</p>
    </Reveal>
  );
}

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [model, setModel] = useState(seedModel);
  const [source, setSource] = useState(API_URL ? "loading" : "seed");
  const lenis = useLenis();

  useEffect(() => {
    if (!API_URL) return;
    let alive = true;
    fetchDashboard()
      .then((d) => { if (alive) { setModel(buildModel(d)); setSource("live"); } })
      .catch((e) => { if (alive) { setSource("seed"); console.error("Gagal memuat API, pakai seed:", e); } });
    return () => { alive = false; };
  }, []);

  const idx = model.lastIdx;
  const g = (id) => model.metrics.find((m) => m.id === id);

  const MARQUEE = useMemo(() => [
    { value: pct(model.series.total[idx]), label: "ESG Index YTD", color: "var(--rag-green)" },
    { value: pct(g("fuel_ratio").achievement[idx]), label: "Fuel Ratio", color: "var(--accent)" },
    { value: "0", label: "LTI-FR", color: "var(--rag-green)" },
    { value: pct(g("renewable").actual[idx]), label: "Renewable Mix", color: "var(--sky)" },
    { value: num(g("comdev").actual[idx]) + " org", label: "Community Dev", color: "var(--violet)" },
    { value: pct(g("waste_diverted").achievement[idx]), label: "Waste Diverted", color: "var(--mint)" },
    { value: pct(model.kpis.forecastYearEnd), label: "Forecast Des", color: "var(--rag-yellow)" },
  ], [model]);

  const PANELS = useMemo(() => model.categories.map((c) => {
    const lead = c.metrics.slice().sort((a, b) => b.bobot - a.bobot)[0];
    return { ...lead, kategori: c.name };
  }), [model]);

  const NEWS = model.berita && model.berita.length ? model.berita : STATIC_NEWS;

  const toggle = () => { const t = theme === "dark" ? "light" : "dark"; setTheme(t); document.documentElement.dataset.theme = t; };
  const skip = () => { const el = document.getElementById("dashboard"); if (!el) return; lenis.current ? lenis.current.scrollTo(el, { offset: -16 }) : el.scrollIntoView({ behavior: "smooth" }); };

  const srcDot = { live: ["var(--rag-green)", "LIVE"], seed: ["var(--muted)", "SEED"], loading: ["var(--rag-yellow)", "MEMUAT"] }[source];

  return (
    <>
      <header className="topbar">
        <div className="wordmark">DASBORT<span style={{ color: "var(--accent)" }}>·</span>ESG<sup>®</sup></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="kick" title={source === "live" ? "Data dari Google Sheet" : "Data seed statis"}>
            <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 9, background: srcDot[0], marginRight: 6 }} />{srcDot[1]}
          </span>
          <span className="kick">{model.kpis.dataAsOf}</span>
          <button className="btn" onClick={toggle}>{theme === "dark" ? "Terang" : "Gelap"}</button>
          <button className="btn btn-primary" onClick={skip}>Dashboard →</button>
        </div>
      </header>

      <Hero model={model} />
      <VelocityMarquee items={MARQUEE} />

      <section className="wrap">
        <SectionHead n="01 / GALERI" title="Galeri & dokumentasi ESG" sub="Unggah foto atau video kegiatan — reklamasi, K3, community development. Bisa file atau tautan (mp4/YouTube/Vimeo)." />
        <Reveal delay={0.08}><MediaGallery items={GALLERY} /></Reveal>
      </section>

      <section className="wrap">
        <SectionHead n="02 / PILAR" title="Dua pilar ESG" sub="Environmental & Social. Governance dalam pengembangan (PROPER menyusul)." />
      </section>
      <PillarStack pillars={model.pillars} />

      <section className="wrap">
        <SectionHead n="03 / PARAMETER" title="Parameter utama" sub="Capaian tiap kategori terhadap target 2026." />
      </section>
      <StoryParallax panels={PANELS} />

      <Dashboard model={model} news={NEWS} />
    </>
  );
}
