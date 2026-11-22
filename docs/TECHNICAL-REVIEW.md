# PFMS — Dokumentasi Pengembangan, Pengujian, Profiling, dan Code Review

Versi pengembangan: 1.1.0  
Stack: Next.js 15, React 19, TypeScript, Prisma 6, PostgreSQL, Node.js 20.9+.

## 1. Ruang lingkup dan arsitektur

PFMS mencatat akun keuangan (Cash, Bank, E-Wallet), transaksi pemasukan/pengeluaran/transfer, kategori global/pribadi, anggaran bulanan, laporan, dashboard, autentikasi, dan audit log.

| Modul             | Lokasi                                                   | Tanggung jawab                                                                               |
| ----------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Autentikasi       | `src/lib/auth.ts`, `src/lib/session.ts`, `src/app/login` | Better Auth (session cookie HTTP-only), validasi sesi, login/logout, role ADMIN/AUDITOR/USER |
| Aksi aplikasi     | `src/app/actions.ts`                                     | Validasi input, otorisasi pemilik data, CRUD, audit log, revalidasi                          |
| Akses data        | `src/lib/prisma.ts`, `prisma/schema.prisma`              | Prisma Client dan model relasional                                                           |
| Akun              | `src/app/accounts/page.tsx`                              | Tambah, ubah, hapus/nonaktif akun                                                            |
| Transaksi         | `src/app/transactions/page.tsx`                          | CRUD transaksi, kategori, pencarian, sorting                                                 |
| Anggaran          | `src/app/budgets/page.tsx`                               | Upsert dan hapus anggaran                                                                    |
| Dashboard/laporan | `src/app/dashboard`, `src/app/reports`                   | Agregasi saldo, arus kas, ringkasan periode                                                  |
| Algoritma         | `src/lib/algorithms.ts`                                  | Merge sort, linear search, binary search                                                     |
| Domain finansial  | `src/lib/finance.ts`                                     | Perhitungan saldo dan ringkasan arus kas                                                     |

## 2. Algoritma sorting dan searching

### 2.1 Merge sort

`mergeSort<T>(items, compare)` membagi array menjadi dua bagian, mengurutkan rekursif, lalu menggabungkan hasil. Algoritma stabil karena elemen sisi kiri dipilih saat comparator menghasilkan nilai sama. Input tidak dimutasi.

- Waktu best/average/worst: **O(n log n)**.
- Memori tambahan: **O(n)** untuk array hasil dan proses merge.
- Dipakai pada riwayat transaksi untuk sorting tanggal, nominal, atau jenis.

### 2.2 Linear search

`linearSearch(items, predicate)` memeriksa elemen satu per satu sampai ketemu.

- Best: O(1); average/worst: O(n).
- Memori tambahan: O(1).
- Cocok untuk koleksi kecil atau pencarian tanpa prasyarat data terurut.

### 2.3 Binary search

`binarySearch(items, target, compare)` memakai batas low/high dan membagi ruang pencarian menjadi dua. Input harus sudah terurut dengan comparator yang sama. Fungsi mengembalikan indeks kecocokan pertama atau -1.

- Best: O(1); average/worst: O(log n).
- Memori tambahan: O(1) (iteratif).
- Tidak digunakan untuk pencarian bebas pada daftar transaksi yang belum terurut; gunakan setelah sorting atau pada data yang memang terindeks/terurut.

### 2.4 Pencarian UI

Riwayat transaksi mendukung pencarian substring pada deskripsi, kategori, akun, tujuan, dan jenis, serta pencarian ID eksak dengan linear search melalui pola `id:<UUID>`. Penyaringan substring satu lintasan O(n), pencarian ID O(n), kemudian sorting O(n log n). Total didominasi O(n log n); memori O(n) untuk hasil tersaring dan merge sort. Untuk skala data besar, pindahkan filter dan orderBy ke PostgreSQL serta gunakan pagination agar tidak memuat seluruh riwayat ke memori Node.js.

## 3. CRUD dan aturan integritas

| Entitas          | Create                | Read              | Update                | Delete              |
| ---------------- | --------------------- | ----------------- | --------------------- | ------------------- |
| Akun             | `addAccount`          | halaman akun      | `updateAccount`       | `deleteAccount`     |
| Kategori pribadi | `addCategory`         | halaman transaksi | `updateCategory`      | `deleteCategory`    |
| Transaksi        | `addTransaction`      | riwayat/laporan   | `updateTransaction`   | `deleteTransaction` |
| Anggaran         | `saveBudget` (upsert) | halaman anggaran  | `saveBudget` (upsert) | `deleteBudget`      |

Aturan penting:

- Semua aksi data memanggil `auth()` dan memeriksa kepemilikan berdasarkan `userId`/`ownerId`.
- Akun yang telah direferensikan transaksi dinonaktifkan (soft delete), bukan dihapus fisik.
- Kategori yang masih dipakai transaksi/anggaran juga dinonaktifkan.
- Transaksi dihapus fisik setelah verifikasi pemilik; audit log CREATE/UPDATE/DELETE dicatat di transaksi database yang sama.
- Transfer memerlukan akun tujuan berbeda milik user yang sama, tanpa kategori. Pemasukan/pengeluaran memerlukan kategori dengan jenis yang sesuai.
- Anggaran unik per user, kategori, tahun, dan bulan melalui constraint Prisma.
- Saldo transfer mengurangi akun sumber dan menambah akun tujuan; transfer tidak dihitung sebagai pemasukan/pengeluaran.

## 4. Pengujian otomatis

Tool: Node.js test runner (`node:test`), `tsx`, dan `assert/strict`. Test unit berada di `tests/algorithms.test.ts`.

Kasus uji:

1. Merge sort mengurutkan angka dan tidak memutasi input.
2. Merge sort stabil untuk elemen dengan key sama.
3. Linear search menemukan data dan mengembalikan -1 bila tidak ada.
4. Binary search menangani duplikat, data tidak ditemukan, dan array kosong.
5. Comparator teks mengabaikan kapital dan mendukung urutan numerik.
6. Saldo memperhitungkan pemasukan, pengeluaran, serta kedua sisi transfer.
7. Ringkasan arus kas mengabaikan transfer.
8. Validasi nominal menolak nol, negatif, NaN, dan Infinity.
9. Agregasi saldo banyak akun memproses transaksi satu kali.

Jalankan:

```bash
npm install
npm test
npm run typecheck
npm run build
```

### Pengujian integrasi yang perlu dijalankan terhadap PostgreSQL

Gunakan database pengujian terpisah, jangan database produksi. Setelah `.env` diisi:

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Skenario integrasi manual/API:

- Login dengan kredensial valid dan tidak valid; user nonaktif tidak dapat login.
- User A tidak dapat membaca/mengubah/menghapus ID akun, kategori, transaksi, atau anggaran milik User B.
- Buat akun, ubah nama/saldo, lalu hapus; akun yang sudah direferensikan harus menjadi nonaktif.
- Buat kategori, ubah, dan hapus; kategori yang direferensikan menjadi nonaktif.
- Buat pemasukan/pengeluaran dengan kategori yang tepat; tolak kategori yang salah jenis.
- Buat transfer antar akun sendiri; tolak akun tujuan sama, akun orang lain, kategori terisi, atau tujuan kosong.
- Ubah dan hapus transaksi; saldo, laporan, dashboard, dan audit log harus konsisten.
- Upsert anggaran untuk kombinasi user/kategori/periode yang sama memperbarui nominal, bukan membuat duplikat.
- Tolak nominal <= 0, tanggal tidak valid, bulan di luar 1–12, serta ID tidak dikenal.

Selain skenario manual di atas, tersedia integration test otomatis lapisan database di `tests/integration.test.ts` (`npm run test:integration`; dilewati otomatis bila `DATABASE_URL` tidak diatur). Lembar pengujiannya ada di `docs/INTEGRATION-TEST.md`; kolom hasil aktual diisi setelah dijalankan pada mesin target.

## 5. Profiling dan kompleksitas

Jalankan `npm run profile`. Script melakukan _warm-up_ (3 kali), lalu 7 kali pengukuran dan melaporkan **median** waktu (`performance.now()`), jumlah pemanggilan fungsi pembanding/predikat, dan estimasi tambahan heap untuk merge sort, linear search, dan binary search pada 1.000, 10.000, dan 50.000 data. Warm-up diperlukan karena run tunggal dipengaruhi kompilasi JIT: pada versi lama, 1.000 item tercatat lebih lambat daripada 10.000 item. Jumlah pemanggilan comparator merge sort mendekati n log2 n (sekitar 718 ribu untuk n=50.000). Hasil bergantung pada CPU, versi Node.js, dan beban mesin, jadi simpan keluaran dari mesin Anda sendiri sebagai bukti. Ini microbenchmark algoritma; untuk statement database gunakan `prisma/explain-analyze.sql` (`EXPLAIN (ANALYZE, BUFFERS)`).

| Komponen              | Kompleksitas waktu | Memori tambahan | Risiko skala                     |
| --------------------- | -----------------: | --------------: | -------------------------------- |
| Merge sort            |         O(n log n) |            O(n) | alokasi array saat merge         |
| Linear search         |               O(n) |            O(1) | melambat linear                  |
| Binary search         |           O(log n) |            O(1) | perlu data terurut               |
| Filter transaksi      |               O(n) |      O(n) hasil | transfer banyak data dari DB     |
| Saldo akun (per akun) |               O(n) |            O(1) | hindari loop transaksi bersarang |

Perbaikan profiling: perhitungan saldo dashboard dipindahkan dari pola nested reduce O(A×T) ke `accountBalances`, yang menginisialisasi map akun lalu memproses transaksi satu kali: O(A + T) waktu dan O(A) memori. Pemuatan semua transaksi di dashboard tetap dapat diganti agregasi SQL untuk skala besar.

## 6. Catatan code review

### Temuan yang diperbaiki

| ID    | Temuan awal                                                | Risiko                                                       | Perbaikan                                                            |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| CR-01 | Tidak ada edit/hapus transaksi, akun, kategori, anggaran   | Data tidak dapat dikelola sepanjang siklus hidup             | Tambah aksi update/delete dan UI                                     |
| CR-02 | Tidak tersedia sorting/search riwayat                      | Sulit menemukan transaksi                                    | Filter substring dan merge sort dengan pilihan tanggal/nominal/jenis |
| CR-03 | Perhitungan saldo dashboard menggunakan reduce bersarang   | Beban komputasi meningkat terhadap jumlah akun dan transaksi | Ekstrak fungsi domain dan gunakan map saldo                          |
| CR-04 | Belum ada test otomatis                                    | Regresi logika tidak terdeteksi                              | Tambah test runner dan 9 unit test                                   |
| CR-05 | Belum ada prosedur profiling                               | Bottleneck tidak terukur                                     | Tambah benchmark terukur untuk tiga algoritma                        |
| CR-06 | Dokumentasi README menyatakan CRUD dan test belum tersedia | Onboarding tidak lengkap                                     | README dan dokumen teknis diperbarui                                 |

### Risiko/pekerjaan lanjutan yang masih terbuka

- Login belum memiliki rate limiting/lockout dan belum ada alur reset password.
- `AUTH_SECRET` wajib diatur (minimal 32 karakter); aplikasi gagal start bila tidak tersedia. Gunakan nilai acak kuat pada deployment.
- Server action melempar error validasi; UI belum menampilkan pesan validasi yang ramah pengguna secara konsisten.
- Pagination/filter transaksi sebaiknya dilakukan di database untuk dataset besar.
- Integration test otomatis sudah tersedia untuk lapisan database; uji otorisasi lintas pengguna pada server action masih berupa skenario manual.
- Pertimbangkan constraint database untuk memastikan aturan transfer/kategori secara struktural.
- Panel Admin dapat menambah pengguna dan menampilkan audit log; role AUDITOR hanya dapat melihat (read-only). CRUD kategori global belum tersedia.

### Pengecualian coding guideline

Server Actions menggunakan `FormData` dan tipe enum Prisma di-cast pada batas input (`as any`) pada kode awal dan beberapa action lama. Ini dipertahankan sementara agar sesuai dengan pola form yang ada, tetapi sebaiknya diganti parser/validator bertipe (misalnya Zod) dan enum Prisma eksplisit. Pengecualian kompatibilitas ini bukan rekomendasi untuk modul baru.

## 7. Pemetaan terhadap dokumen tugas

| Dokumen kompetensi                        | Implementasi/bukti pada proyek                                                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menganalisis skalabilitas perangkat lunak | `docs/SCALABILITY.md` (lingkup, lingkungan, masalah, kompleksitas, estimasi hardware) dan bagian profiling                                                              |
| Menggunakan SQL                           | `prisma/schema.prisma`, migration `*_unit2_sql_objects`, dan `prisma/unit-2-objects.sql` (DDL, DML, indeks, view, function, stored procedure, trigger, commit/rollback) |
| Menerapkan akses basis data               | Prisma Client, PostgreSQL, relasi, index, autentikasi, role ADMIN/AUDITOR/USER, dan ownership checks                                                                    |
| Mengimplementasikan algoritma pemrograman | `algorithms.ts`, `scripts/menu.ts` (program menu konsol), fungsi reusable, unit test dan kompleksitas                                                                   |
| Membuat dokumen kode program              | TSDoc pada `src/lib/*.ts`, `npm run docs:api` (TypeDoc) dan dokumen ini                                                                                                 |
| Melakukan debugging                       | Pemeriksaan sintaks TypeScript/TSX dan smoke test; jalankan build pada lingkungan proyek untuk validasi penuh                                                           |
| Melakukan profiling program               | `scripts/profile.ts` (waktu median, jumlah pemanggilan, heap) dan `prisma/explain-analyze.sql`                                                                          |
| Menerapkan code review                    | Temuan, dampak, perbaikan, dan risiko tersisa pada bagian code review                                                                                                   |
| Pengujian unit program                    | `tests/algorithms.test.ts`                                                                                                                                              |
| Pengujian integrasi program               | `tests/integration.test.ts` dan lembar uji `docs/INTEGRATION-TEST.md`                                                                                                   |

## 8. Cara instalasi dan menjalankan

1. Ekstrak ZIP proyek.
2. Pastikan Node.js 20.9+ dan Docker/PostgreSQL tersedia.
3. Salin `.env.example` menjadi `.env`, lalu isi `AUTH_SECRET` (minimal 32 karakter) dan `ACC_PASSWORD`.
4. `docker compose up -d`, lalu `npm install`.
5. `npx prisma migrate dev` (menerapkan semua migration, termasuk role AUDITOR dan objek SQL Unit 2, serta membuat Prisma Client), kemudian `npm run db:seed`.
6. `npm test`, `npm run typecheck`, `npm run build`; opsional `npm run test:integration`, `npm run profile`, `npm run menu`.
7. `npm run dev`, lalu buka `http://localhost:3000`.

Akun demo seed: `user@pfms.local` (USER) dan `admin@pfms.local` (ADMIN); password diambil dari `ACC_PASSWORD` di `.env`. Akun AUDITOR dibuat oleh ADMIN melalui panel Admin. Ganti kredensial demo sebelum penggunaan nyata.
