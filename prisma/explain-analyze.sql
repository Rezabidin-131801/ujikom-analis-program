-- =====================================================================
-- Profiling statement database (Unit 3 uji performa & Unit 7 profiling)
-- Jalankan di database PENGUJIAN:  psql "$DATABASE_URL" -f prisma/explain-analyze.sql
-- Prasyarat: migration + prisma/unit-2-objects.sql (pengguna demo 1111...).
-- Catat "Execution Time", jenis scan (Seq Scan / Index Scan), dan jumlah baris.
-- =====================================================================

-- 1. (Opsional) bangkitkan 100.000 transaksi sintetis agar perbedaan indeks terlihat.
--    Trigger audit dimatikan sementara agar tidak membuat 100.000 baris audit.
ALTER TABLE transactions DISABLE TRIGGER trg_transaction_audit;
INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, occurred_at)
SELECT gen_random_uuid(),
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
       'EXPENSE',
       (random() * 100000)::numeric(18,2),
       timestamptz '2026-01-01' + (random() * interval '330 days')
FROM generate_series(1, 100000);
ALTER TABLE transactions ENABLE TRIGGER trg_transaction_audit;
ANALYZE transactions;

-- 2. Riwayat transaksi per user (memakai indeks user_id, occurred_at)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM transactions
WHERE user_id = '11111111-1111-4111-8111-111111111111'
ORDER BY occurred_at DESC LIMIT 50;

-- 3. Agregasi bulanan (memakai indeks type, occurred_at)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM fn_monthly_category_expense('11111111-1111-4111-8111-111111111111', 2026, 11);

-- 4. Pengguna melewati batas pengeluaran
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM fn_users_over_limit(2026, 11, 100000);

-- 5. View detail transaksi
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM v_transaction_details
WHERE user_id = '11111111-1111-4111-8111-111111111111' ORDER BY occurred_at DESC LIMIT 50;

-- 6. Pola dashboard saat ini: memuat SEMUA transaksi user (tanpa LIMIT) -> bandingkan dengan nomor 2
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM transactions WHERE user_id = '11111111-1111-4111-8111-111111111111';

-- 7. Pembersihan data sintetis
-- ALTER TABLE transactions DISABLE TRIGGER trg_transaction_audit;
-- DELETE FROM transactions WHERE user_id = '11111111-1111-4111-8111-111111111111';
-- ALTER TABLE transactions ENABLE TRIGGER trg_transaction_audit;
