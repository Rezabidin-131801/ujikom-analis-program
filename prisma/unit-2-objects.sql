-- =====================================================================
-- Unit 2 - Menggunakan SQL (PostgreSQL) - PFMS
-- Jalankan SETELAH `npx prisma migrate dev` (tabel dibuat oleh migration = DDL).
-- Script ini idempotent: aman dijalankan berulang.
--   psql "$DATABASE_URL" -f prisma/unit-2-objects.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. DDL tambahan: indeks (identik dengan migration; IF NOT EXISTS)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "transactions_type_occurred_at_idx" ON "transactions"("type", "occurred_at");

-- ---------------------------------------------------------------------
-- 2. View, function, stored procedure, trigger
-- ---------------------------------------------------------------------
-- ============================================================
-- View
-- ============================================================
CREATE OR REPLACE VIEW v_transaction_details AS
SELECT t.id AS transaction_id, t.user_id, u.name AS user_name, t.type, t.amount,
       t.occurred_at, fa.name AS account_name, c.name AS category_name
FROM transactions t
JOIN users u ON u.id = t.user_id
JOIN financial_accounts fa ON fa.id = t.account_id
LEFT JOIN categories c ON c.id = t.category_id;

CREATE OR REPLACE VIEW v_active_accounts AS
SELECT id, user_id, name, type, initial_balance, currency_code, is_active
FROM financial_accounts
WHERE is_active = TRUE;

-- ============================================================
-- Function: total pengeluaran per kategori pada satu bulan
-- ============================================================
CREATE OR REPLACE FUNCTION fn_monthly_category_expense(p_user UUID, p_year INT, p_month INT)
RETURNS TABLE(category_id UUID, category_name VARCHAR, total_expense NUMERIC)
LANGUAGE SQL AS $$
  SELECT c.id, c.name, COALESCE(SUM(t.amount), 0)
  FROM categories c
  LEFT JOIN transactions t
    ON t.category_id = c.id
   AND t.user_id = p_user
   AND t.type = 'EXPENSE'
   AND t.occurred_at >= make_date(p_year, p_month, 1)
   AND t.occurred_at <  make_date(p_year, p_month, 1) + interval '1 month'
  WHERE c.type = 'EXPENSE' AND (c.owner_id IS NULL OR c.owner_id = p_user)
  GROUP BY c.id, c.name
  ORDER BY c.name;
$$;

-- Function: pengguna yang total pengeluaran bulanannya melebihi batas
CREATE OR REPLACE FUNCTION fn_users_over_limit(p_year INT, p_month INT, p_limit NUMERIC)
RETURNS TABLE(user_id UUID, user_name VARCHAR, total_expense NUMERIC)
LANGUAGE SQL AS $$
  SELECT u.id, u.name, SUM(t.amount)
  FROM transactions t
  JOIN users u ON u.id = t.user_id
  WHERE t.type = 'EXPENSE'
    AND t.occurred_at >= make_date(p_year, p_month, 1)
    AND t.occurred_at <  make_date(p_year, p_month, 1) + interval '1 month'
  GROUP BY u.id, u.name
  HAVING SUM(t.amount) > p_limit
  ORDER BY 3 DESC;
$$;

-- ============================================================
-- Stored procedure
-- ============================================================
-- Menghitung jumlah pengguna yang melewati batas (hasil lewat parameter OUT).
CREATE OR REPLACE PROCEDURE sp_count_users_over_limit(IN p_year INT, IN p_month INT, IN p_limit NUMERIC, OUT p_total BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
  SELECT COUNT(*) INTO p_total FROM fn_users_over_limit(p_year, p_month, p_limit);
END; $$;

-- Menampilkan pengguna yang melewati batas (keluar sebagai pesan NOTICE per baris).
CREATE OR REPLACE PROCEDURE sp_show_users_over_limit(IN p_year INT, IN p_month INT, IN p_limit NUMERIC)
LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM fn_users_over_limit(p_year, p_month, p_limit) LOOP
    RAISE NOTICE 'pengguna=% total_pengeluaran=%', r.user_name, r.total_expense;
  END LOOP;
END; $$;

-- ============================================================
-- Trigger: audit otomatis setiap INSERT/UPDATE/DELETE transaksi
-- (audit_logs.id tidak punya default di DB, jadi id wajib diisi)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_audit_transaction() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_actor UUID;
  v_entity UUID;
  v_details JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_actor := OLD.user_id; v_entity := OLD.id; v_details := jsonb_build_object('old', to_jsonb(OLD));
  ELSE
    v_actor := NEW.user_id; v_entity := NEW.id; v_details := jsonb_build_object('new', to_jsonb(NEW));
  END IF;

  INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details)
  VALUES (gen_random_uuid(), v_actor,
          CASE TG_OP WHEN 'INSERT' THEN 'CREATE' ELSE TG_OP END,
          'TRANSACTION', v_entity::text, v_details);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_transaction_audit ON transactions;
CREATE TRIGGER trg_transaction_audit
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION fn_audit_transaction();

-- ---------------------------------------------------------------------
-- 3. DML: input data (level/user, akun, kategori, transaksi, anggaran)
--    Pengguna demo tidak punya kredensial login (hanya untuk uji SQL).
-- ---------------------------------------------------------------------
DELETE FROM transactions       WHERE user_id = '11111111-1111-4111-8111-111111111111';
DELETE FROM budgets            WHERE user_id = '11111111-1111-4111-8111-111111111111';
DELETE FROM audit_logs         WHERE actor_id = '11111111-1111-4111-8111-111111111111';
DELETE FROM financial_accounts WHERE user_id = '11111111-1111-4111-8111-111111111111';
DELETE FROM categories         WHERE owner_id = '11111111-1111-4111-8111-111111111111';
DELETE FROM users              WHERE id IN ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333');

INSERT INTO users (id, name, email, role, updated_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 'SQL Demo User', 'sql.demo@pfms.local', 'USER', now());

INSERT INTO financial_accounts (id, user_id, name, type, initial_balance) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Kas Demo',  'CASH', 1000000),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'Bank Demo', 'BANK', 0);

INSERT INTO categories (id, owner_id, name, type) VALUES
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'Makan (demo SQL)',  'EXPENSE'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '11111111-1111-4111-8111-111111111111', 'Gaji (demo SQL)',   'INCOME');

-- Trigger trg_transaction_audit aktif pada INSERT berikut.
INSERT INTO transactions (id, user_id, account_id, destination_account_id, category_id, type, amount, description, occurred_at) VALUES
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NULL, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'INCOME',   5000000, 'Gaji November', '2026-11-01 08:00+07'),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NULL, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'EXPENSE',   150000, 'Makan siang',   '2026-11-05 12:30+07'),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NULL, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'EXPENSE',   250000, 'Makan malam',   '2026-11-12 19:00+07');

INSERT INTO transactions (id, user_id, account_id, destination_account_id, category_id, type, amount, description, occurred_at) VALUES
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', NULL, 'TRANSFER', 500000, 'Pindah ke bank', '2026-11-15 10:00+07');

INSERT INTO budgets (id, user_id, category_id, year, month, amount) VALUES
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 2026, 11, 600000);

-- ---------------------------------------------------------------------
-- 4. DML: manipulasi antar tabel dan antar view
-- ---------------------------------------------------------------------
-- Antar tabel (JOIN + agregasi)
SELECT u.name, fa.name AS akun, COUNT(t.id) AS jumlah_transaksi, SUM(t.amount) AS total
FROM users u
JOIN financial_accounts fa ON fa.user_id = u.id
LEFT JOIN transactions t ON t.account_id = fa.id
WHERE u.id = '11111111-1111-4111-8111-111111111111'
GROUP BY u.name, fa.name;

-- Update antar tabel: nonaktifkan akun yang tidak dipakai transaksi
UPDATE financial_accounts fa SET is_active = FALSE
WHERE fa.user_id = '11111111-1111-4111-8111-111111111111'
  AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.account_id = fa.id OR t.destination_account_id = fa.id);

-- Antar view: transaksi dari view detail yang akunnya masih aktif
SELECT d.transaction_id, d.type, d.amount, d.account_name
FROM v_transaction_details d
JOIN v_active_accounts a ON a.name = d.account_name AND a.user_id = d.user_id
WHERE d.user_id = '11111111-1111-4111-8111-111111111111'
ORDER BY d.occurred_at;

-- ---------------------------------------------------------------------
-- 5. Uji function, stored procedure, dan trigger
-- ---------------------------------------------------------------------
SELECT * FROM fn_monthly_category_expense('11111111-1111-4111-8111-111111111111', 2026, 11) WHERE total_expense > 0;  -- hasil: 400000
SELECT * FROM fn_users_over_limit(2026, 11, 100000);
CALL sp_show_users_over_limit(2026, 11, 100000);            -- hasil tampil sebagai NOTICE
CALL sp_count_users_over_limit(2026, 11, 100000, NULL);     -- hasil: p_total

-- Trigger: harus ada 4 baris CREATE untuk pengguna demo
SELECT action, entity_type, details->'new'->>'type' AS tipe, details->'new'->>'amount' AS nominal
FROM audit_logs WHERE actor_id = '11111111-1111-4111-8111-111111111111' ORDER BY created_at;

-- ---------------------------------------------------------------------
-- 6. COMMIT dan ROLLBACK
-- ---------------------------------------------------------------------
-- COMMIT setelah insert data master (kategori global)
DELETE FROM categories WHERE name = 'Investasi (demo SQL)' AND owner_id IS NULL;
BEGIN;
INSERT INTO categories (id, owner_id, name, type) VALUES (gen_random_uuid(), NULL, 'Investasi (demo SQL)', 'INCOME');
COMMIT;
SELECT count(*) AS kategori_investasi_setelah_commit FROM categories WHERE name = 'Investasi (demo SQL)';  -- 1

-- ROLLBACK setelah hapus 1 data pengguna
INSERT INTO users (id, name, email, role, updated_at) VALUES
  ('33333333-3333-4333-8333-333333333333', 'Rollback Demo', 'rollback.demo@pfms.local', 'USER', now());
BEGIN;
DELETE FROM users WHERE id = '33333333-3333-4333-8333-333333333333';
SELECT count(*) AS di_dalam_transaksi FROM users WHERE id = '33333333-3333-4333-8333-333333333333';  -- 0
ROLLBACK;
SELECT count(*) AS setelah_rollback FROM users WHERE id = '33333333-3333-4333-8333-333333333333';    -- 1

-- ---------------------------------------------------------------------
-- 7. Pembersihan data demo (opsional; hapus tanda komentar bila perlu)
-- ---------------------------------------------------------------------
-- DELETE FROM transactions       WHERE user_id = '11111111-1111-4111-8111-111111111111';
-- DELETE FROM budgets            WHERE user_id = '11111111-1111-4111-8111-111111111111';
-- DELETE FROM audit_logs         WHERE actor_id = '11111111-1111-4111-8111-111111111111';
-- DELETE FROM financial_accounts WHERE user_id = '11111111-1111-4111-8111-111111111111';
-- DELETE FROM categories         WHERE owner_id = '11111111-1111-4111-8111-111111111111' OR name = 'Investasi (demo SQL)';
-- DELETE FROM users              WHERE id IN ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333');
