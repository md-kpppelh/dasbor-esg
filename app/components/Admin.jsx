import { useState, useEffect, useMemo } from "react";
import * as api from "../lib/api.js";
import { pct, num } from "../lib/format.js";
import { METRIC_INPUTS, computeMetric } from "../lib/metricInputs.js";

/* Login + panel Admin/User (jalur TULIS ke data bank). Wajib backend live (API_URL terisi). */

export function LoginModal({ onClose, onSuccess }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await api.login(u.trim(), p);
      if (r.ok) onSuccess(r.token, r.user);
      else setErr(r.error || "Login gagal.");
    } catch (ex) { setErr("Tak bisa menghubungi server. Cek API_URL."); }
    setBusy(false);
  };
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Masuk</div>
        <h3 style={{ fontSize: 22, marginBottom: 16 }}>Login Admin / User</h3>
        {err && <div className="notice err">{err}</div>}
        <div className="field"><label>Username</label><input className="input" value={u} onChange={(e) => setU(e.target.value)} autoFocus /></div>
        <div className="field"><label>Sandi</label><input className="input" type="password" value={p} onChange={(e) => setP(e.target.value)} /></div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Memproses…" : "Masuk"}</button>
          <button className="btn" type="button" onClick={onClose}>Batal</button>
        </div>
      </form>
    </div>
  );
}

export function AdminPanel({ token, user, model, onClose, onChanged, onExpired }) {
  const [tab, setTab] = useState("data");
  const [notice, setNotice] = useState(null);
  const flash = (ok, msg) => { setNotice({ ok, msg }); setTimeout(() => setNotice(null), 4000); };
  const guard = (r) => {
    if (r && r.ok) return true;
    if (r && /sesi/i.test(r.error || "")) { onExpired(); return false; }
    flash(false, (r && r.error) || "Gagal."); return false;
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div>
            <div className="eyebrow">Panel {user?.peran || "admin"}</div>
            <h3 style={{ fontSize: 20 }}>Kelola Data ESG</h3>
          </div>
          <button className="btn" onClick={onClose}>Tutup ✕</button>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>Masuk sebagai <b style={{ color: "var(--ink)" }}>{user?.nama || user?.username}</b></div>

        <div className="tabs">
          {[["input", "Input Bulanan"], ["data", "Data"], ["galeri", "Galeri"], ["berita", "Berita"], ["config", "Konfigurasi"], ["audit", "Audit"]].map(([k, l]) => (
            <button key={k} className="btn" style={tab === k ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {notice && <div className={"notice " + (notice.ok ? "ok" : "err")}>{notice.msg}</div>}

        {tab === "input" && <InputBulananTab token={token} model={model} guard={guard} flash={flash} onChanged={onChanged} />}
        {tab === "data" && <DataTab token={token} model={model} guard={guard} flash={flash} onChanged={onChanged} />}
        {tab === "galeri" && <GaleriTab token={token} model={model} guard={guard} flash={flash} onChanged={onChanged} />}
        {tab === "berita" && <BeritaTab token={token} model={model} guard={guard} flash={flash} onChanged={onChanged} />}
        {tab === "config" && <ConfigTab token={token} guard={guard} flash={flash} onChanged={onChanged} />}
        {tab === "audit" && <AuditTab token={token} />}
      </div>
    </div>
  );
}

function InputBulananTab({ token, model, guard, flash, onChanged }) {
  const months = model.months;
  const existing = useMemo(() => { try { return JSON.parse(model.config?.esgdata || "{}"); } catch { return {}; } }, [model.config]);
  const [month, setMonth] = useState(Math.min(model.lastIdx + 2, 12));
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const v = {};
    for (const mid in existing) { const e = existing[mid] && existing[mid][month]; if (e && e.raw) v[mid] = { ...e.raw }; }
    setVals(v);
  }, [month, existing]);

  const setField = (mid, k, value) => setVals((s) => ({ ...s, [mid]: { ...(s[mid] || {}), [k]: value } }));

  const save = async () => {
    setBusy(true);
    const merged = JSON.parse(JSON.stringify(existing));
    let count = 0;
    for (const m of model.metrics) {
      if (!METRIC_INPUTS[m.id]) continue;
      const out = computeMetric(m, vals[m.id] || {}, month);
      if (!out || out.ach == null) continue;
      if (!merged[m.id]) merged[m.id] = {};
      merged[m.id][month] = { aktual: out.aktual, achievement: out.ach, raw: vals[m.id] };
      count++;
    }
    const r = await api.updateConfig(token, "esgdata", JSON.stringify(merged));
    setBusy(false);
    if (guard(r)) { flash(true, `Tersimpan ${count} metrik untuk ${months[month - 1]} 2026.`); onChanged(); }
  };

  return (
    <>
      <p className="sec-sub" style={{ marginBottom: 6 }}>Isi angka mentah bulanan — website menghitung achievement & ESG index otomatis. Tak perlu buka Excel.</p>
      <div className="field"><label>Bulan</label>
        <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {months.map((m, i) => <option key={m} value={i + 1}>{m} 2026</option>)}
        </select>
      </div>
      {model.metrics.map((m) => {
        const spec = METRIC_INPUTS[m.id]; if (!spec) return null;
        const out = computeMetric(m, vals[m.id] || {}, month);
        return (
          <div key={m.id} style={{ borderTop: "1px solid var(--grid-line)", padding: "12px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <b style={{ fontSize: 13 }}>{m.name} <span className="muted" style={{ fontWeight: 400 }}>· bobot {pct(m.bobot, 0)}</span></b>
              <span className="mono" style={{ fontSize: 12, color: out && out.ach != null ? "var(--accent)" : "var(--muted)" }}>{out && out.ach != null ? "Achv " + pct(out.ach) : "—"}</span>
            </div>
            <div className="row2" style={{ marginTop: 8 }}>
              {spec.fields.map((f) => (
                <div className="field" key={f.k} style={{ margin: 0 }}>
                  <label>{f.label}</label>
                  <input className="input" type="number" step="any" value={vals[m.id] && vals[m.id][f.k] != null ? vals[m.id][f.k] : ""} onChange={(e) => setField(m.id, f.k, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy} onClick={save}>{busy ? "Menyimpan…" : "Hitung & Simpan bulan ini"}</button>
    </>
  );
}

function DataTab({ token, model, guard, flash, onChanged }) {
  const [mid, setMid] = useState(model.metrics[1]?.id || model.metrics[0].id);
  const [bulan, setBulan] = useState(model.lastIdx + 1);
  const [field, setField] = useState("achievement");
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const metric = model.metrics.find((m) => m.id === mid);
  const current = metric?.[field === "achievement" ? "achievement" : "actual"]?.[bulan - 1];

  const save = async () => {
    setBusy(true);
    const r = await api.upsertData(token, { param: mid, tahun: 2026, bulan, field, nilai: val === "" ? "" : Number(val) });
    setBusy(false);
    if (guard(r)) { flash(true, `Tersimpan: ${metric.name} · ${["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][bulan-1]} · ${field}`); setVal(""); onChanged(); }
  };

  return (
    <>
      <p className="sec-sub" style={{ marginBottom: 14 }}>Ubah nilai bulanan satu metrik. Dashboard ikut diperbarui.</p>
      <div className="field"><label>Metrik</label>
        <select className="input" value={mid} onChange={(e) => setMid(e.target.value)}>
          {model.metrics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="row2">
        <div className="field"><label>Bulan</label>
          <select className="input" value={bulan} onChange={(e) => setBulan(Number(e.target.value))}>
            {model.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="field"><label>Field</label>
          <select className="input" value={field} onChange={(e) => setField(e.target.value)}>
            <option value="achievement">achievement (0–1,25)</option>
            <option value="aktual">aktual (nilai mentah)</option>
          </select>
        </div>
      </div>
      <div className="field"><label>Nilai sekarang: {current == null ? "—" : field === "achievement" ? pct(current) : num(current, 4)}</label>
        <input className="input" type="number" step="any" placeholder="nilai baru" value={val} onChange={(e) => setVal(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={busy || val === ""} onClick={save}>{busy ? "Menyimpan…" : "Simpan"}</button>
    </>
  );
}

function BeritaTab({ token, model, guard, flash, onChanged }) {
  const [f, setF] = useState({ date: "", title: "", desc: "" });
  const add = async () => {
    if (!f.title) return;
    const r = await api.manageBerita(token, { op: "add", ...f });
    if (guard(r)) { flash(true, "Berita ditambah."); setF({ date: "", title: "", desc: "" }); onChanged(); }
  };
  const del = async (title) => { const r = await api.manageBerita(token, { op: "delete", title }); if (guard(r)) { flash(true, "Berita dihapus."); onChanged(); } };
  return (
    <>
      <p className="sec-sub" style={{ marginBottom: 14 }}>Berita & penghargaan yang tampil di dashboard.</p>
      <div className="row2">
        <div className="field"><label>Tanggal/Tahun</label><input className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} placeholder="2025" /></div>
        <div className="field"><label>Judul</label><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      </div>
      <div className="field"><label>Ringkasan</label><input className="input" value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></div>
      <button className="btn btn-primary" onClick={add} disabled={!f.title}>Tambah berita</button>
      <div style={{ marginTop: 18 }}>
        {(model.berita || []).map((b, i) => (
          <div key={i} className="news-item">
            <div className="news-date">{b.date}</div>
            <div style={{ flex: 1 }}><b>{b.title}</b><div className="muted" style={{ fontSize: 12 }}>{b.desc}</div></div>
            <button className="btn" onClick={() => del(b.title)}>Hapus</button>
          </div>
        ))}
      </div>
    </>
  );
}

const CONFIG_FIELDS = [
  ["judul", "Judul dashboard"], ["data_as_of", "Data per (YYYY-MM)"], ["target_komposit", "Target komposit (1 = 100%)"],
  ["cap", "Plafon (1.25 = 125%)"], ["rag_green", "Ambang hijau (1 = 100%)"], ["rag_yellow", "Ambang kuning (0.9 = 90%)"],
  ["forecast_metode", "Metode forecast (linear/ma)"], ["astra_2030_nonfosil", "Target Astra 2030 nonfosil (0.8)"],
];
function ConfigTab({ token, guard, flash, onChanged }) {
  const [key, setKey] = useState(CONFIG_FIELDS[0][0]);
  const [value, setValue] = useState("");
  const save = async () => { const r = await api.updateConfig(token, key, value); if (guard(r)) { flash(true, `Konfigurasi ${key} disimpan.`); setValue(""); onChanged(); } };
  return (
    <>
      <p className="sec-sub" style={{ marginBottom: 14 }}>Ubah pengaturan (ambang RAG, target, judul, dll).</p>
      <div className="field"><label>Pengaturan</label>
        <select className="input" value={key} onChange={(e) => setKey(e.target.value)}>
          {CONFIG_FIELDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="field"><label>Nilai baru</label><input className="input" value={value} onChange={(e) => setValue(e.target.value)} /></div>
      <button className="btn btn-primary" onClick={save} disabled={value === ""}>Simpan</button>
    </>
  );
}

function GaleriTab({ token, model, guard, flash, onChanged }) {
  const [items, setItems] = useState(model.gallery || []);
  const [f, setF] = useState({ judul: "", kategori: "", url: "" });
  const [busy, setBusy] = useState(false);
  const persist = async (next) => {
    setBusy(true);
    const r = await api.updateConfig(token, "galeri", JSON.stringify(next));
    setBusy(false);
    if (guard(r)) { setItems(next); onChanged(); return true; }
    return false;
  };
  const add = async () => {
    if (!f.url) { flash(false, "URL foto/video wajib diisi."); return; }
    const next = [...items, { id: "g" + Date.now(), judul: f.judul, kategori: f.kategori, url: f.url.trim() }];
    if (await persist(next)) { flash(true, "Ditambahkan ke galeri."); setF({ judul: "", kategori: "", url: "" }); }
  };
  const del = async (id) => { if (await persist(items.filter((x) => x.id !== id))) flash(true, "Item dihapus."); };
  return (
    <>
      <p className="sec-sub" style={{ marginBottom: 6 }}>Tambah foto/video lewat TAUTAN — tersimpan permanen & tampil untuk semua pengunjung.</p>
      <p className="sec-sub" style={{ marginBottom: 14, color: "var(--muted)" }}>Punya file di komputer? Unggah dulu ke Google Drive/Photos (set "siapa saja dengan link"), lalu tempel tautannya di sini.</p>
      <div className="row2">
        <div className="field"><label>Judul</label><input className="input" value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} /></div>
        <div className="field"><label>Kategori</label><input className="input" value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })} placeholder="Lingkungan / Sosial" /></div>
      </div>
      <div className="field"><label>URL foto / video</label><input className="input" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://… .jpg / .mp4 / YouTube" /></div>
      <button className="btn btn-primary" onClick={add} disabled={busy || !f.url}>{busy ? "Menyimpan…" : "Tambah ke galeri"}</button>
      <div style={{ marginTop: 18 }}>
        {items.length === 0 && <div className="muted" style={{ fontSize: 12 }}>Belum ada item galeri.</div>}
        {items.map((it) => (
          <div key={it.id} className="news-item">
            <div style={{ flex: 1, minWidth: 0 }}><b>{it.judul || "Tanpa judul"}</b><div className="muted" style={{ fontSize: 11, wordBreak: "break-all" }}>{it.kategori ? it.kategori + " · " : ""}{it.url}</div></div>
            <button className="btn" onClick={() => del(it.id)}>Hapus</button>
          </div>
        ))}
      </div>
    </>
  );
}

function AuditTab({ token }) {
  const [log, setLog] = useState(null);
  const load = async () => { try { const r = await api.fetchAudit(token); setLog(r.log || []); } catch { setLog([]); } };
  return (
    <>
      <button className="btn" onClick={load}>Muat 50 log terbaru</button>
      <div style={{ marginTop: 14 }}>
        {log && log.length === 0 && <div className="muted" style={{ fontSize: 12 }}>Belum ada log.</div>}
        {log && log.map((r, i) => (
          <div key={i} className="audit-row">
            <span>{String(r.waktu).slice(0, 16).replace("T", " ")}</span>
            <span>{r.user} · {r.aksi}</span>
            <span>{r.param} {r.baru !== "" ? "→ " + r.baru : ""}</span>
          </div>
        ))}
      </div>
    </>
  );
}
