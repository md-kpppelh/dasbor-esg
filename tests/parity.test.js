/**
 * Uji paritas Fase 1 — memastikan esg-engine.js mereproduksi angka Excel PERSIS.
 * Gerbang mutu: bila meleset, engine dianggap salah.
 *
 * Jalankan:  node src/dasbort-esg/tests/parity.test.js
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  computeSeries,
  metricAchievement,
} from "../engine/esg-engine.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(
  readFileSync(join(HERE, "..", "data", "seed-esg.json"), "utf-8")
);

const TOL_TOTAL = 1e-9; // paritas total harus nyaris eksak
const TOL_L1 = 1e-6;    // paritas rumus Layer-1
const MONTHS_WITH_DATA = 6; // Jan-Jun

let pass = 0;
let fail = 0;
const fmtPct = (v) => (v == null ? "  (kosong)" : (v * 100).toFixed(1) + "%");

function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${detail}`); }
}

console.log("\n== Uji Paritas Dasbort ESG (Fase 1) ==\n");

// 1) Total bobot = 100%
const bobot = seed.metrics.reduce((a, m) => a + m.bobot, 0);
check(`Total bobot = 1.0 (dapat ${bobot.toFixed(4)})`, Math.abs(bobot - 1) < 1e-9);

// 2) Paritas YTD POINT TOTAL (baris 52) Jan-Jun
const { total, sum } = computeSeries(seed);
console.log("\n  YTD Index ESG Point (engine vs Excel):");
for (let i = 0; i < MONTHS_WITH_DATA; i++) {
  const got = total[i];
  const exp = seed.expected.total[i];
  const ok = got != null && exp != null && Math.abs(got - exp) < TOL_TOTAL;
  check(
    `${seed.months[i]}: ${fmtPct(got)} == ${fmtPct(exp)}`,
    ok,
    ok ? "" : `selisih ${got != null && exp != null ? Math.abs(got - exp).toExponential(2) : "n/a"}`
  );
}

// 3) Paritas SUM sebelum cap (baris 51) Jan-Jun
for (let i = 0; i < MONTHS_WITH_DATA; i++) {
  const ok = sum[i] != null && Math.abs(sum[i] - seed.expected.sum[i]) < TOL_TOTAL;
  check(`SUM ${seed.months[i]} == Excel`, ok);
}

// 4) Paritas rumus Layer-1 untuk metrik yang rumusnya sudah direplikasi
const L1 = ["ratio", "fuel_inverse"];
console.log("\n  Layer-1 %Achievement (rumus vs Excel), Jan-Jun:");
for (const m of seed.metrics.filter((x) => L1.includes(x.rumus))) {
  let allOk = true;
  for (let i = 0; i < MONTHS_WITH_DATA; i++) {
    const actual = seed.data[m.id].aktual[i];
    const expAch = seed.data[m.id].achievement[i];
    const got = metricAchievement(m, actual);
    if (got == null || expAch == null || Math.abs(got - expAch) > TOL_L1) allOk = false;
  }
  check(`${m.name} [${m.rumus}]`, allOk);
}

// 5) Bulan tanpa data (Jul-Des) harus null, bukan #DIV/0!
const julDesNull = total.slice(6).every((v) => v == null);
check("Jul-Des = null (guard #DIV/0!)", julDesNull);

console.log(`\n== Hasil: ${pass} lulus, ${fail} gagal ==\n`);
process.exit(fail === 0 ? 0 : 1);
