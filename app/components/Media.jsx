import { useState, useRef } from "react";

/* Slot media: unggah foto/video, atau tempel URL (mp4/YouTube/Vimeo). Tersimpan di localStorage.
   Deploy di akun orang lain: aman — tak ada backend, tak ada kredensial. Fase 5 menyambung ke data bank. */

function detectType(src) {
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(src)) return "embed";
  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(src)) return "video";
  return "image";
}
function embedUrl(src) {
  const yt = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  if (yt) return "https://www.youtube.com/embed/" + yt[1];
  const vm = src.match(/vimeo\.com\/(\d+)/i);
  if (vm) return "https://player.vimeo.com/video/" + vm[1];
  return src;
}
function renderMedia(m) {
  if (m.type === "embed") return <iframe src={embedUrl(m.src)} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="video" style={{ width: "100%", height: "100%", border: 0 }} />;
  if (m.type === "video") return <video src={m.src} controls playsInline preload="metadata" />;
  return <img src={m.src} alt="" loading="lazy" />;
}

export function MediaSlot({ id, label = "Media", tag, aspect = "16 / 9", height, editable = true }) {
  const key = "esg:media:" + id;
  const [media, setMedia] = useState(() => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } });
  const [showUrl, setShowUrl] = useState(false);
  const fileRef = useRef(null);

  const save = (m) => { setMedia(m); try { localStorage.setItem(key, JSON.stringify(m)); } catch { /* kuota penuh: tetap tampil sesi ini */ } };
  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const type = f.type.startsWith("video") ? "video" : "image";
    if (type === "image") { const r = new FileReader(); r.onload = () => save({ src: r.result, type, persist: true }); r.readAsDataURL(f); }
    else setMedia({ src: URL.createObjectURL(f), type, persist: false }); // video besar: preview sesi; gunakan URL untuk permanen
    e.target.value = "";
  };
  const onUrl = (e) => { const v = e.target.value.trim(); if (v) save({ src: v, type: detectType(v), persist: true }); setShowUrl(false); };
  const clear = () => { setMedia(null); try { localStorage.removeItem(key); } catch { } };

  return (
    <div className="media" style={height ? { height } : { aspectRatio: aspect }}>
      {media ? renderMedia(media) : editable ? (
        <div className="media-empty">
          <div className="ic">＋</div>
          <div className="mono" style={{ fontSize: 12 }}>{label}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => fileRef.current.click()}>Unggah</button>
            <button className="btn" onClick={() => setShowUrl((s) => !s)}>Tautan</button>
          </div>
          {showUrl && <input className="media-url" placeholder="Tempel URL foto/video (mp4, YouTube, Vimeo)…" autoFocus onKeyDown={(e) => e.key === "Enter" && onUrl(e)} onBlur={onUrl} />}
        </div>
      ) : (
        <div className="media-empty">
          <div className="ic" style={{ color: "var(--muted)" }}>▤</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>Belum ada media</div>
        </div>
      )}
      {media && editable && (
        <div className="media-tools">
          <button className="btn" onClick={() => fileRef.current.click()}>Ganti</button>
          <button className="btn" onClick={clear}>Hapus</button>
        </div>
      )}
      {media && (tag || media.persist === false) && (
        <div className="media-cap">
          {tag ? <span className="media-tag">{tag}</span> : <span />}
          {media.persist === false && <span className="media-tag">preview sesi</span>}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={onFile} />
    </div>
  );
}

export function MediaGallery({ items, editable = true }) {
  return (
    <div className="grid g-3">
      {items.map((it) => <MediaSlot key={it.id} {...it} editable={editable} />)}
    </div>
  );
}
