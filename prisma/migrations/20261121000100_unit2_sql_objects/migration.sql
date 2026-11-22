-- CreateIndex: mempercepat agregasi bulanan (fn_monthly_category_expense, fn_users_over_limit)
CREATE INDEX "transactions_type_occurred_at_idx" ON "transactions"("type", "occurred_at");

-- Objek SQL Unit 2 (view, function, stored procedure, trigger).
-- Disimpan di migration agar selalu terpasang; trigger menggantikan pencatatan audit di kode aplikasi.
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
