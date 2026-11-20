# Personal Finance Management System (PFMS)

Aplikasi pencatatan keuangan pribadi berbasis Next.js 15, TypeScript, Prisma, dan PostgreSQL.

## Fitur
- Login session cookie HTTP-only; role ADMIN dan USER.
- Multi akun Cash, Bank, E-Wallet.
- Transaksi pemasukan, pengeluaran, dan transfer antar akun milik user yang sama.
- CRUD akun, kategori pribadi, transaksi, dan anggaran.
- Pencarian riwayat transaksi serta sorting tanggal, nominal, dan jenis menggunakan merge sort.
- Kategori global dan kategori pribadi.
- Anggaran bulanan per kategori; dashboard, laporan, panel Admin read-only, audit log.
- Algoritma merge sort, linear search, binary search, dan fungsi saldo teruji.

## Persyaratan
Node.js 20.9+ dan PostgreSQL.

## Setup
1. Jalankan:
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm test
npm run typecheck
npm run dev

2. Buka http://localhost:3000.
Akun demo: `user@pfms.local` / `User12345!`; admin: `admin@pfms.local` / `Admin12345!`.

## Pengujian dan profiling
- `npm test`: unit test algoritma dan perhitungan finansial.
- `npm run typecheck`: pemeriksaan TypeScript.
- `npm run build`: Prisma generate dan Next.js production build.
- `npm run profile`: benchmark merge sort, linear search, binary search pada 1.000, 10.000, dan 50.000 item.

## Dokumentasi
Lihat [`docs/ALGORITHM-FLOW.md`](docs/ALGORITHM-FLOW.md) untuk pseudocode dan flowchart, [`docs/CODE-REVIEW.md`](docs/CODE-REVIEW.md) untuk laporan code review, serta [`docs/TECHNICAL-REVIEW.md`](docs/TECHNICAL-REVIEW.md) untuk arsitektur, algoritma dan kompleksitas, CRUD, test cases, prosedur integration testing, profiling, dan catatan code review.

## Catatan keamanan
Ini tetap merupakan aplikasi pembelajaran/MVP, belum siap produksi tanpa hardening. Gunakan secret kuat, ganti akun demo, aktifkan HTTPS, siapkan backup, rate limiting login, dan integration/security testing. Data yang memiliki relasi historis dinonaktifkan (soft delete) untuk menjaga integritas referensial.
