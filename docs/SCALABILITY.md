# Analisis Skalabilitas PFMS (Unit 1)

> Angka volume dan hardware di bawah adalah **asumsi perencanaan**, bukan hasil pengukuran. Sesuaikan dengan target pengguna sebenarnya.

## 1. Lingkup sistem

Aplikasi web pencatatan keuangan pribadi: login multi-role (ADMIN, AUDITOR, USER), multi akun (Cash/Bank/E-Wallet), transaksi (pemasukan, pengeluaran, transfer), kategori, anggaran bulanan, dashboard, laporan, panel admin dan audit log.

## 2. Lingkungan operasi

Client-server: browser -> Next.js 15 (server actions, Node.js 20.9+) -> PostgreSQL 18 (Prisma + pg adapter). Sesi disimpan di database (Better Auth), sehingga server aplikasi stateless dan dapat direplikasi.

## 3. Masalah skalabilitas yang teridentifikasi

| Area                                | Kondisi saat ini                                               | Dampak saat data tumbuh                                                           |
| ----------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Halaman transaksi/dashboard/laporan | `findMany` semua transaksi user, tanpa `take`/pagination       | Memori dan transfer data naik linear terhadap jumlah transaksi                    |
| Sorting riwayat                     | Merge sort di sisi aplikasi, O(n log n), memori O(n)           | Beban CPU per request ikut naik; lebih efisien `ORDER BY ... LIMIT` di database   |
| Saldo akun                          | Dihitung dari seluruh transaksi (`accountBalances`, O(A + T))  | Mahal untuk user dengan ribuan transaksi; pertimbangkan saldo ter-agregasi di SQL |
| Audit log                           | Trigger menyimpan baris penuh (JSONB) tiap perubahan transaksi | Tabel `audit_logs` tumbuh lebih cepat dari `transactions`; perlu retensi/partisi  |
| Koneksi database                    | Satu pool per instance aplikasi                                | Banyak instance dapat menghabiskan `max_connections`; perlu pooler                |

## 4. Kompleksitas aplikasi

| Operasi                                            | Waktu                                 | Memori tambahan     |
| -------------------------------------------------- | ------------------------------------- | ------------------- |
| Sorting riwayat transaksi                          | O(n log n)                            | O(n)                |
| Pencarian ID eksak (linear)                        | O(n)                                  | O(1)                |
| Saldo seluruh akun                                 | O(A + T)                              | O(A)                |
| Agregasi bulanan (SQL, indeks `type, occurred_at`) | sebanding dengan baris pada bulan itu | dikelola PostgreSQL |

## 5. Estimasi data dan kebutuhan hardware (asumsi)

Asumsi: 1.000 pengguna aktif, rata-rata 50 transaksi/bulan/pengguna.

- Transaksi: sekitar 50.000 baris/bulan, sekitar 600.000/tahun (kira-kira 200-300 byte/baris, belum termasuk indeks).
- Audit log: jumlahnya sama dengan transaksi tetapi lebih besar per baris karena memuat JSONB.
- Perkiraan ukuran database: ratusan MB per tahun termasuk indeks (verifikasi dengan `pg_total_relation_size`).

| Komponen        | Minimum (sampai sekitar 1.000 pengguna aktif) | Pertumbuhan                                           |
| --------------- | --------------------------------------------- | ----------------------------------------------------- |
| Server aplikasi | 2 vCPU, 4 GB RAM                              | Tambah instance di belakang load balancer (stateless) |
| Database        | 2 vCPU, 4 GB RAM, SSD                         | Naikkan RAM (cache), read replica untuk laporan       |
| Jaringan        | HTTPS (TLS), bandwidth standar                | CDN untuk aset statis                                 |

## 6. Rekomendasi

1. Pagination dan `ORDER BY ... LIMIT` di database untuk daftar transaksi.
2. Pindahkan agregasi dashboard/laporan ke SQL (`fn_monthly_category_expense` sudah tersedia).
3. Connection pooler (mis. PgBouncer) bila instance aplikasi lebih dari satu.
4. Retensi/partisi `audit_logs` per bulan; indeks tambahan hanya berdasarkan hasil `EXPLAIN ANALYZE` (`prisma/explain-analyze.sql`).
5. Rate limiting login dan caching/revalidate halaman laporan.
6. Pantau dengan `pg_stat_statements` dan ukur ulang memakai `npm run profile` sebelum dan sesudah optimasi.
