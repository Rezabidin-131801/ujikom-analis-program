# Lembar Pengujian Integrasi PFMS (Unit 10)

## 1. Peralatan dan lingkungan

| Item              | Keterangan                                                                        |
| ----------------- | --------------------------------------------------------------------------------- |
| Tool uji          | Node.js test runner (`node:test`) + `tsx`, Prisma Client, `pg` adapter            |
| Database          | PostgreSQL 18 via `docker compose up -d` (database pengujian, bukan produksi)     |
| Dokumen pendukung | `prisma/unit-2-objects.sql`, `docs/ALGORITHM-FLOW.md`, `docs/TECHNICAL-REVIEW.md` |
| Perintah          | `npx prisma migrate dev` lalu `npm run test:integration`                          |

## 2. Data uji

Dibangkitkan otomatis oleh test (UUID acak per run, dibersihkan di akhir): 1 user (role AUDITOR), 2 akun (Kas saldo awal 1.000.000, Bank 0), 1 kategori pengeluaran, transaksi pengeluaran 150.000 dan transfer 50.000 pada November 2026.

## 3. Skenario otomatis (`tests/integration.test.ts`)

| ID    | Modul yang diintegrasikan                     | Skenario                                                         | Hasil diharapkan                                                                          | Hasil aktual      | Status |
| ----- | --------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------- | ------ |
| IT-01 | Schema <-> Prisma enum                        | Enum `UserRole` memuat ADMIN, AUDITOR, USER; insert role AUDITOR | Berhasil                                                                                  | _isi setelah run_ | \_     |
| IT-02 | Migration <-> objek SQL                       | View, function, procedure, trigger terpasang                     | 2 view, 5 routine, 1 trigger                                                              | \_                | \_     |
| IT-03 | Transaksi <-> trigger <-> audit_logs          | INSERT, UPDATE, DELETE satu transaksi                            | audit: CREATE, UPDATE, DELETE                                                             | \_                | \_     |
| IT-04 | Transaksi <-> view <-> function <-> procedure | Data pengeluaran 150.000                                         | view menampilkan kategori; total bulanan 150.000; batas 100.000 terlampaui, 200.000 tidak | \_                | \_     |
| IT-05 | Database <-> `finance.ts`                     | Hitung saldo dari baris DB                                       | Kas 800.000; Bank 50.000                                                                  | \_                | \_     |
| IT-06 | Transaksi DB (ROLLBACK)                       | Insert lalu throw dalam `$transaction`                           | Jumlah baris tidak berubah                                                                | \_                | \_     |
| IT-07 | Integritas referensial                        | Hapus akun yang dipakai transaksi                                | Ditolak (FK RESTRICT)                                                                     | \_                | \_     |

## 4. Skenario manual (UI/server action)

| ID    | Skenario                                        | Hasil diharapkan                                                                  | Hasil aktual | Status |
| ----- | ----------------------------------------------- | --------------------------------------------------------------------------------- | ------------ | ------ |
| MT-01 | Login USER, ADMIN, AUDITOR; user nonaktif       | Valid masuk; nonaktif/kredensial salah ditolak                                    | \_           | \_     |
| MT-02 | USER membuka `/admin`                           | Diarahkan ke `/dashboard`                                                         | \_           | \_     |
| MT-03 | AUDITOR membuka `/admin`                        | Daftar pengguna dan audit log tampil, **tanpa** form tambah pengguna              | \_           | \_     |
| MT-04 | ADMIN menambah pengguna role AUDITOR            | Pengguna dibuat, bisa login                                                       | \_           | \_     |
| MT-05 | USER A mengakses ID akun/transaksi milik USER B | Ditolak ("tidak ditemukan")                                                       | \_           | \_     |
| MT-06 | Tambah pengeluaran lalu ubah dan hapus          | Saldo dashboard, laporan, dan audit log konsisten (tiap aksi tepat 1 baris audit) | \_           | \_     |
| MT-07 | Transfer antar akun sendiri                     | Saldo sumber turun, tujuan naik, arus kas tidak berubah                           | \_           | \_     |

## 5. Pelaporan

Isi kolom "Hasil aktual" dan "Status" (Lulus/Gagal) setelah menjalankan pengujian, lampirkan keluaran `npm run test:integration`, catat kondisi data yang tidak sesuai beserta dugaan penyebab, lalu arsipkan dokumen ini bersama keluaran test.
