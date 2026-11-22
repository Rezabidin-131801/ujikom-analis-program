/**
 * Profiling algoritma PFMS (Unit 7): waktu eksekusi (median), jumlah pemanggilan
 * fungsi pembanding, dan estimasi tambahan memori heap.
 *
 * - Warm-up dijalankan dulu agar hasil tidak terdistorsi kompilasi JIT.
 * - Untuk memori yang lebih stabil: `node --expose-gc --import tsx scripts/profile.ts`
 * - Statement database diprofil terpisah dengan `prisma/explain-analyze.sql`.
 */
import { performance } from "node:perf_hooks";
import { mergeSort, linearSearch, binarySearch } from "../src/lib/algorithms";

const SIZES = [1_000, 10_000, 50_000];
const WARMUP = 3;
const RUNS = 7;
const gc = (globalThis as { gc?: () => void }).gc;

type Row = {
  size: number;
  name: string;
  ms: number;
  calls: number;
  heapKb: number;
};
const rows: Row[] = [];

const median = (xs: number[]) =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/** Mengukur median waktu (ms) dari RUNS kali eksekusi setelah warm-up. */
function timeIt(fn: () => unknown): number {
  for (let i = 0; i < WARMUP; i++) fn();
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  return median(samples);
}

/** Estimasi tambahan heap (KB) untuk satu eksekusi; hasil ditahan agar tidak langsung di-GC. */
function heapDeltaKb(fn: () => unknown): number {
  gc?.();
  const before = process.memoryUsage().heapUsed;
  const kept = fn();
  const after = process.memoryUsage().heapUsed;
  void kept;
  return Math.max(0, (after - before) / 1024);
}

for (const size of SIZES) {
  const input = Array.from({ length: size }, () =>
    Math.floor(Math.random() * size * 10),
  );
  const sorted = [...input].sort((a, b) => a - b);
  const target = sorted[Math.floor(size / 2)];

  let calls = 0;
  const cmpCounting = (a: number, b: number) => (calls++, a - b);
  const cmp = (a: number, b: number) => a - b;

  calls = 0;
  mergeSort(input, cmpCounting);
  rows.push({
    size,
    name: "mergeSort",
    ms: timeIt(() => mergeSort(input, cmp)),
    calls,
    heapKb: heapDeltaKb(() => mergeSort(input, cmp)),
  });

  calls = 0;
  linearSearch(input, (x) => (calls++, x === target));
  rows.push({
    size,
    name: "linearSearch",
    ms: timeIt(() => linearSearch(input, (x) => x === target)),
    calls,
    heapKb: heapDeltaKb(() => linearSearch(input, (x) => x === target)),
  });

  calls = 0;
  binarySearch(sorted, target, cmpCounting);
  rows.push({
    size,
    name: "binarySearch",
    ms: timeIt(() => binarySearch(sorted, target, cmp)),
    calls,
    heapKb: heapDeltaKb(() => binarySearch(sorted, target, cmp)),
  });
}

console.log(
  `PFMS algorithm profile | Node ${process.version} | warm-up=${WARMUP}, runs=${RUNS}, nilai=median`,
);
console.log(
  "ukuran  | algoritma     | median (ms) | pemanggilan fungsi | heap (KB)",
);
console.log(
  "--------|---------------|-------------|--------------------|----------",
);
for (const r of rows) {
  console.log(
    `${String(r.size).padStart(7)} | ${r.name.padEnd(13)} | ${r.ms.toFixed(3).padStart(11)} | ${String(r.calls).padStart(18)} | ${r.heapKb.toFixed(0).padStart(9)}`,
  );
}
if (!gc)
  console.log(
    "\nCatatan: kolom heap berfluktuasi karena GC; untuk hasil stabil jalankan dengan --expose-gc (lihat komentar di atas file).",
  );
const biggest = rows
  .filter((r) => r.size === SIZES[SIZES.length - 1])
  .sort((a, b) => b.ms - a.ms)[0];
console.log(
  `\nBottleneck pada n=${biggest.size}: ${biggest.name} (${biggest.ms.toFixed(3)} ms). Merge sort memang O(n log n) dan memakai memori O(n).`,
);
