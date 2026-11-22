# Laporan Code Review PFMS

- Proyek: Personal Finance Management System
- Basis review: `personal-finance-management.zip` dan persyaratan kompetensi pada `Tugas.zip`
- Cakupan: struktur Next.js/TypeScript, server actions, Prisma schema, transaksi, dashboard, sorting/searching, pengujian.
- Hasil: perbaikan fungsional dan dokumentasi dilakukan; belum dinyatakan production-ready.

## Ringkasan temuan

| ID    | Prioritas | Temuan awal                                                            | Dampak                                              | Tindakan                                                                    |
| ----- | --------- | ---------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------- |
| CR-01 | Tinggi    | CRUD update/delete belum tersedia untuk transaksi dan sejumlah entitas | Data sulit dikoreksi atau dikelola                  | Tambah update/delete akun, kategori, transaksi, dan anggaran                |
| CR-02 | Sedang    | Riwayat transaksi tidak menyediakan pencarian dan pilihan sorting      | Pengguna sulit menemukan data                       | Tambah filter kata kunci, pencarian ID eksak, sorting tanggal/nominal/jenis |
| CR-03 | Sedang    | Saldo dashboard memakai reduce bersarang per akun                      | Waktu komputasi tumbuh O(A×T)                       | Gunakan `accountBalances` satu lintasan O(A+T)                              |
| CR-04 | Tinggi    | Belum ada unit test otomatis                                           | Perubahan dapat menyebabkan regresi                 | Tambah 9 test untuk algoritma dan perhitungan finansial                     |
| CR-05 | Sedang    | Belum ada prosedur profiling                                           | Tidak ada baseline kinerja                          | Tambah script benchmark untuk 3 algoritma                                   |
| CR-06 | Tinggi    | Fallback secret autentikasi dapat berbahaya jika terbawa ke production | Risiko pemalsuan sesi bila secret default diketahui | Production sekarang mensyaratkan `AUTH_SECRET` minimal 32 karakter          |
| CR-07 | Rendah    | Dokumentasi awal belum menggambarkan keterbatasan/fitur CRUD dan test  | Pengembang/penilai tidak mendapat gambaran akurat   | Perbarui README dan dokumen teknis                                          |

## Perbaikan dan hasil verifikasi

1. Merge sort, linear search, binary search, dan comparator teks ditambahkan.
2. Sorting transaksi menggunakan merge sort; pencarian ID eksak menggunakan linear search.
3. Operasi CRUD diperluas dengan pemeriksaan kepemilikan data.
4. Penghapusan akun/kategori yang masih direferensikan dilakukan sebagai soft delete agar relasi tetap valid.
5. Perubahan/penghapusan transaksi mencatat audit log dalam transaksi database.
6. Saldo akun dihitung satu lintasan dan transfer dicatat pada kedua sisi.
7. Secret autentikasi production divalidasi.
8. Sembilan unit test berhasil dijalankan melalui Node.js test runner setelah kompilasi modul TypeScript. Pemeriksaan transpile sintaks semua file TS/TSX juga tidak menemukan kesalahan.

## Risiko yang belum ditutup

- Instalasi dependency dan build Next.js penuh belum tervalidasi pada sesi review ini karena `npm install` tidak selesai dalam batas waktu lingkungan.
- Belum ada integration test otomatis terhadap PostgreSQL; prosedur dan skenario uji disediakan di `TECHNICAL-REVIEW.md`.
- Belum ada rate limiting/lockout login dan reset password.
- UI belum menangani semua pesan error server action dengan komponen feedback yang konsisten.
- Riwayat transaksi dan dashboard masih dapat memuat banyak baris; perlu pagination dan agregasi SQL saat volume tumbuh.
- Panel Admin masih read-only; pengelolaan kategori global tidak termasuk CRUD yang ditambahkan.

## Rekomendasi sebelum produksi

1. Jalankan `npm install`, `npm test`, `npm run typecheck`, `npm run build` pada mesin target.
2. Jalankan integration test dengan database PostgreSQL khusus pengujian.
3. Terapkan validasi skema (misalnya Zod), rate limiting, dan audit login.
4. Tambahkan pagination dan query agregasi pada database.
5. Lakukan review keamanan dan backup/restore drill.

## Pembaruan review (iterasi berikutnya)

| ID    | Prioritas | Temuan                                                                                                                                                                                                                                     | Tindakan                                                                                                                                    |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| CR-08 | Tinggi    | Trigger `fn_audit_transaction` menyisipkan ke `audit_logs` tanpa `id`, sedangkan kolom `id` tidak punya default di database (UUID dibuat Prisma di sisi aplikasi). Bila dipasang, setiap insert transaksi gagal dengan NOT NULL violation. | `id` diisi `gen_random_uuid()` di trigger.                                                                                                  |
| CR-09 | Sedang    | Audit transaksi akan tercatat ganda bila trigger diperbaiki, karena aksi di `actions.ts` juga menulis `auditLog`.                                                                                                                          | Pencatatan audit transaksi dipindah ke trigger; kode aplikasi tidak lagi menulisnya. Audit pembuatan user (admin) tetap di kode.            |
| CR-10 | Sedang    | Objek SQL (view/function/procedure/trigger) hanya ada di file manual, tidak ikut `migrate dev`; `CREATE TRIGGER` gagal bila dijalankan dua kali.                                                                                           | Dipindah ke migration `*_unit2_sql_objects`; `unit-2-objects.sql` dibuat idempotent dan dilengkapi DML, uji, serta demo COMMIT/ROLLBACK.    |
| CR-11 | Sedang    | Hanya dua role (ADMIN, USER).                                                                                                                                                                                                              | Ditambah role AUDITOR (read-only) di enum, auth, validasi, layout, dan panel Admin.                                                         |
| CR-12 | Sedang    | Benchmark satu kali tanpa warm-up menghasilkan angka tidak monoton (1.000 item lebih lambat dari 10.000) dan tidak mengukur memori.                                                                                                        | `scripts/profile.ts` memakai warm-up, median 7 run, hitung pemanggilan fungsi, dan estimasi heap.                                           |
| CR-13 | Rendah    | Dokumentasi usang (JWT, jumlah test, `.env.example` tidak ada, kredensial demo salah).                                                                                                                                                     | Dokumentasi diperbarui; `.env.example` ditambahkan; `.env` tidak lagi disertakan di ZIP.                                                    |
| CR-14 | Rendah    | `jose` dan `bcryptjs` ada di `package.json` tetapi tidak diimpor; `dotenv` diimpor tetapi tidak dideklarasikan.                                                                                                                            | **Belum diubah** agar `package-lock.json` tetap konsisten; jalankan `npm uninstall jose bcryptjs` dan `npm install dotenv` pada mesin Anda. |

Pengecualian coding guideline tidak berubah (lihat `TECHNICAL-REVIEW.md`). Risiko terbuka: pagination/agregasi SQL pada dashboard dan transaksi (lihat `SCALABILITY.md`), rate limiting login, serta eksekusi `build`, `typecheck`, dan integration test pada mesin dengan database.
