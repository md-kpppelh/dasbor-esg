import { motion } from "motion/react";

/* Galeri carousel horizontal (bergulir ke samping) + kartu fly-in. Data permanen dari CONFIG. */

function typeOf(url) {
  if (!url) return "none";
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) return "embed";
  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url)) return "video";
  return "image";
}
function embedUrl(url) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  if (yt) return "https://www.youtube.com/embed/" + yt[1];
  const vm = url.match(/vimeo\.com\/(\d+)/i);
  if (vm) return "https://player.vimeo.com/video/" + vm[1];
  return url;
}

export function Gallery({ items }) {
  return (
    <div className="gallery-wrap">
      <div className="gallery-row">
        {items.map((it, i) => <Card key={it.id || i} it={it} i={i} />)}
      </div>
      <div className="gallery-hint mono">← geser ke samping →</div>
    </div>
  );
}

function Card({ it, i }) {
  const t = typeOf(it.url);
  return (
    <motion.div
      className="gallery-card"
      initial={{ opacity: 0, y: 64, rotate: -3, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: (i % 5) * 0.07 }}
      whileHover={{ y: -8 }}
    >
      <div className="gallery-media">
        {t === "image" && <img src={it.url} alt={it.judul || ""} loading="lazy" />}
        {t === "video" && <video src={it.url} controls playsInline preload="metadata" />}
        {t === "embed" && <iframe src={embedUrl(it.url)} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={it.judul || "video"} />}
        {t === "none" && <div className="gallery-empty"><span /></div>}
      </div>
      <div className="gallery-meta">
        {it.kategori && <span className="chip">{it.kategori}</span>}
        <div className="gallery-title">{it.judul || "Tanpa judul"}</div>
      </div>
    </motion.div>
  );
}
