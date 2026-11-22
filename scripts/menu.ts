/**
 * Program menu konsol: input angka, sorting, dan searching (Unit 4).
 * Memakai ulang `mergeSort` dan `linearSearch` dari `src/lib/algorithms.ts`.
 * Jalankan: `npm run menu`
 */
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { mergeSort, linearSearch } from "../src/lib/algorithms";

const rl = createInterface({ input: stdin });
const lines = rl[Symbol.asyncIterator]();

/** Menampilkan prompt lalu membaca satu baris; null bila input habis. */
async function ask(prompt: string): Promise<string | null> {
  stdout.write(prompt);
  const { value, done } = await lines.next();
  if (done) return null;
  if (!stdin.isTTY) stdout.write("\n"); // input dari pipe tidak di-echo; beri baris baru agar rapi
  return String(value).trim();
}

/** Membaca satu angka valid; mengulang pertanyaan bila input tidak valid. */
async function askNumber(prompt: string): Promise<number | null> {
  for (;;) {
    const raw = await ask(prompt);
    if (raw === null) return null;
    const n = Number(raw);
    if (raw !== "" && Number.isFinite(n)) return n;
    console.log("Input harus berupa angka.");
  }
}

/** Tanya apakah kembali ke menu utama; false = akhiri program. */
async function backToMenu(): Promise<boolean> {
  for (;;) {
    const a = await ask("Kembali ke menu utama (Y/T): ");
    if (a === null) return false;
    if (/^y$/i.test(a)) return true;
    if (/^t$/i.test(a)) return false;
  }
}

const byValue = (a: number, b: number) => a - b;

async function inputMenu(): Promise<number[] | null> {
  console.log("\nMENU INPUT ANGKA");
  let count = await askNumber("Masukkan jumlah angka: ");
  while (count !== null && (!Number.isInteger(count) || count < 1)) {
    console.log("Jumlah harus bilangan bulat positif.");
    count = await askNumber("Masukkan jumlah angka: ");
  }
  if (count === null) return null;
  const result: number[] = [];
  for (let i = 1; i <= count; i++) {
    const n = await askNumber(`Angka ${i}: `);
    if (n === null) return null;
    result.push(n);
  }
  return result;
}

async function main() {
  let data: number[] = [];
  for (;;) {
    console.log(
      "\nMENU PILIHAN\n1. Input angka\n2. Sorting\n3. Searching\n4. Selesai",
    );
    const choice = await ask("Masukkan pilihan [1/2/3/4] : ");
    if (choice === null || choice === "4") break;

    if (choice === "1") {
      const input = await inputMenu();
      if (input === null) break;
      data = input;
      if (!(await backToMenu())) break;
    } else if (choice === "2") {
      console.log("\nMENU SORTING");
      if (data.length === 0) {
        console.log("Belum ada angka. Pilih menu 1 terlebih dahulu.");
      } else {
        console.log(`Angka yang anda masukan:\n${data.join(", ")}`);
        console.log(
          `Hasil Sorting Angka:\n${mergeSort(data, byValue).join(", ")}`,
        );
      }
      if (!(await backToMenu())) break;
    } else if (choice === "3") {
      console.log("\nMENU SEARCHING");
      if (data.length === 0) {
        console.log("Belum ada angka. Pilih menu 1 terlebih dahulu.");
      } else {
        const target = await askNumber("Masukan Angka yang Anda cari: ");
        if (target === null) break;
        const found = linearSearch(data, (x) => x === target) !== -1;
        console.log(
          `Hasil Searching Angka: ${target}, ${found ? "Ditemukan" : "Tidak Ditemukan"}`,
        );
      }
      if (!(await backToMenu())) break;
    } else {
      console.log("Pilihan tidak valid. Pilih 1, 2, 3, atau 4.");
    }
  }
  console.log("\nProgram selesai.");
  rl.close();
}

main();
