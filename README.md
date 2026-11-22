# Personal Finance Management System (PFMS)

Aplikasi pencatatan keuangan pribadi berbasis Next.js 15, TypeScript, Prisma, Better Auth, dan PostgreSQL.

## Fitur

- Login session cookie HTTP-only; tiga role: **ADMIN** (kelola pengguna), **AUDITOR** (lihat pengguna dan audit log, read-only), **USER** (kelola keuangan sendiri).
- Multi akun Cash, Bank, E-Wallet; transaksi pemasukan, pengeluaran, dan transfer antar akun.
- CRUD akun, kategori pribadi, transaksi, dan anggaran bulanan; kategori global.
- Pencarian dan sorting riwayat transaksi (merge sort, linear search, binary search).
- Dashboard, laporan, panel Admin, dan audit log transaksi yang dicatat oleh trigger database.
- Objek SQL: view, function, stored procedure, trigger (migration `*_unit2_sql_objects`).

## Persyaratan

Node.js 20.9+, PostgreSQL (atau Docker), Prisma 7, Tanstack v9.

## Setup

```
cp .env.example .env        # isi AUTH_SECRET (>= 32 karakter) dan ACC_PASSWORD
docker compose up -d
npm install
npx prisma migrate dev      # menerapkan migration dan membuat Prisma Client
npx prisma db seed
npm run dev
```

Buka http://localhost:3000. Akun demo: `user@pfms.local` dan `admin@pfms.local` (password = `ACC_PASSWORD`). Akun AUDITOR dibuat oleh ADMIN lewat panel Admin.

> Folder `src/generated/prisma` tidak disertakan di ZIP; dibuat otomatis oleh `npx prisma migrate dev` (atau `npx prisma generate`).

## Skrip

`npm test` Unit test algoritma dan perhitungan finansial serta integrasi test database
`npm run test:unit` Unit testing algoritma
`npm run test:integration` Integration test database (butuh PostgreSQL + migration; dilewati bila `DATABASE_URL` kosong)
`npm run typecheck` / `npm run build` Pemeriksaan TypeScript / build produksi
`npm run menu` Program menu konsol: input angka, sorting, searching
`npm run profile` Profiling algoritma (median waktu, pemanggilan fungsi, heap)
`npm run profile:gc` Profiling tanpa GC
`npm run docs:api` Membuat dokumentasi API dengan TypeDoc
`Get-Content prisma/unit-2-objects.sql -Raw  | docker exec -i postgres psql -U postgres -d ujikom-analis-program` Script SQL Unit 2 (DML, uji, COMMIT/ROLLBACK)
`Get-Content prisma/explain-analyze.sql -Raw | docker exec -i postgres psql -U postgres -d ujikom-analis-program` Profiling statement database

## Dokumentasi

`docs/ALGORITHM-FLOW.md` (pseudocode, flowchart), `docs/TECHNICAL-REVIEW.md` (arsitektur, kompleksitas, pengujian), `docs/CODE-REVIEW.md`, `docs/SCALABILITY.md`, `docs/INTEGRATION-TEST.md`.
