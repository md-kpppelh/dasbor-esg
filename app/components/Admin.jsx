import { useState } from "react";
import * as api from "../lib/api.js";
import { pct, num } from "../lib/format.js";

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
          {[["data", "Data"], ["berita", "Berita"], ["config", "Konfigurasi"], ["audit", "Audit"]].map(([k, l]) => (
            <button key={k} className="btn" style={tab === k ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {notice && <div className={"notice " + (notice.ok ? "ok" : "err")}>{notice.msg}</div>}

        {tab === "data" && <DataTab token={token} model={model} guard={guard} flash={flash} onChanged={onChanged} />}
        {tab === "berita" && <BeritaTab token={token} model={model} guard={guard} flash={flash} onChanged={onChanged} />}
        {tab === "config" && <ConfigTab token={token} guard={guard} flash={flash} onChanged={onChanged} />}
        {tab === "audit" && <AuditTab token={token} />}
      </div>
    </div>
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
