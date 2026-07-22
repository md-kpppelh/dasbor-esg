// Format angka Bahasa Indonesia. Semua angka yang tampil dibulatkan.
const ID = "id-ID";

export function pct(v, d = 1) {
  if (v == null || Number.isNaN(v)) return "–";
  return (v * 100).toLocaleString(ID, { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
}

export function num(v, d = 0) {
  if (v == null || Number.isNaN(v)) return "–";
  return v.toLocaleString(ID, { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function signedPct(v, d = 1) {
  if (v == null || Number.isNaN(v)) return "–";
  const s = v > 0 ? "+" : "";
  return s + pct(v, d);
}

export function ragColor(rag) {
  return { green: "var(--rag-green)", yellow: "var(--rag-yellow)", red: "var(--rag-red)", none: "var(--muted)" }[rag] || "var(--muted)";
}

export function ragLabel(rag) {
  return { green: "Tercapai", yellow: "Waspada", red: "Di bawah target", none: "Belum ada data" }[rag] || "–";
}
