// Klien API data bank (Fase 4). Fallback ke seed statis bila API_URL kosong.
import seed from "../../data/seed-esg.json";
import { API_URL } from "./config.js";

/** Ambil data dashboard. Bentuk sama dgn seed → langsung dipakai buildModel(). */
export async function fetchDashboard() {
  if (!API_URL) return seed;
  const res = await fetch(`${API_URL}?action=dashboard`);
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || "gagal memuat data");
  return { meta: j.meta, months: j.months, metrics: j.metrics, data: j.data, berita: j.berita, config: j.config };
}

/** POST text/plain agar tak memicu CORS preflight. `action` di query string (dibaca e.parameter). */
async function apiPost(action, payload, token) {
  if (!API_URL) throw new Error("API_URL belum diisi (mode seed/offline).");
  const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ token }, payload)),
  });
  return res.json();
}

export const login = (username, password) => apiPost("login", { username, password });
export const upsertData = (token, d) => apiPost("upsertData", d, token);
export const updateConfig = (token, key, value) => apiPost("updateConfig", { key, value }, token);
export const updateMetrik = (token, d) => apiPost("updateMetrik", d, token);
export const manageAccount = (token, d) => apiPost("account", d, token);
export const manageBerita = (token, d) => apiPost("berita", d, token);
export const fetchAudit = (token) => apiPost("audit", {}, token);

export const isLive = () => !!API_URL;
