-- Jalankan setelah Prisma migration.
CREATE OR REPLACE VIEW v_transaction_details AS
SELECT t.id transaction_id,t.user_id,u.name user_name,t.type,t.amount,t.occurred_at,fa.name account_name,c.name category_name
FROM transactions t JOIN users u ON u.id=t.user_id JOIN financial_accounts fa ON fa.id=t.account_id LEFT JOIN categories c ON c.id=t.category_id;
CREATE OR REPLACE VIEW v_active_accounts AS SELECT id,user_id,name,type,initial_balance,currency_code,is_active FROM financial_accounts WHERE is_active=TRUE;
CREATE OR REPLACE FUNCTION fn_monthly_category_expense(p_user UUID,p_year INT,p_month INT)
RETURNS TABLE(category_id UUID,category_name VARCHAR,total_expense NUMERIC) LANGUAGE SQL AS $$
SELECT c.id,c.name,COALESCE(SUM(t.amount),0) FROM categories c LEFT JOIN transactions t ON t.category_id=c.id AND t.user_id=p_user AND t.type='EXPENSE' AND t.occurred_at>=make_date(p_year,p_month,1) AND t.occurred_at<make_date(p_year,p_month,1)+interval '1 month' WHERE c.type='EXPENSE' AND (c.owner_id IS NULL OR c.owner_id=p_user) GROUP BY c.id,c.name ORDER BY c.name; $$;
CREATE OR REPLACE PROCEDURE sp_count_users_over_limit(IN p_year INT,IN p_month INT,IN p_limit NUMERIC,OUT p_total BIGINT) LANGUAGE plpgsql AS $$ BEGIN SELECT COUNT(*) INTO p_total FROM (SELECT user_id FROM transactions WHERE type='EXPENSE' AND occurred_at>=make_date(p_year,p_month,1) AND occurred_at<make_date(p_year,p_month,1)+interval '1 month' GROUP BY user_id HAVING SUM(amount)>p_limit) s; END; $$;
CREATE OR REPLACE FUNCTION fn_audit_transaction() RETURNS TRIGGER LANGUAGE plpgsql AS $$ DECLARE u UUID; i UUID; d JSONB; BEGIN IF TG_OP='DELETE' THEN u:=OLD.user_id;i:=OLD.id;d:=jsonb_build_object('old',to_jsonb(OLD)); ELSE u:=NEW.user_id;i:=NEW.id;d:=jsonb_build_object('new',to_jsonb(NEW)); END IF; INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,details) VALUES(u,TG_OP,'TRANSACTION',i::text,d); IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $$;
CREATE TRIGGER trg_transaction_audit AFTER INSERT OR UPDATE OR DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION fn_audit_transaction();
-- COMMIT demo: BEGIN; INSERT INTO categories(id,name,type,is_active) VALUES(gen_random_uuid(),'Investasi','INCOME',TRUE); COMMIT;
-- ROLLBACK demo: BEGIN; DELETE FROM users WHERE email='test@example.com'; ROLLBACK;
