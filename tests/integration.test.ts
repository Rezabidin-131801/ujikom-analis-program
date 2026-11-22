/**
 * Integration test lapisan database PFMS (Unit 10).
 * Memeriksa komunikasi antar-modul: PostgreSQL (schema, trigger, view, function)
 * <-> Prisma Client <-> fungsi domain `finance.ts`.
 *
 * Prasyarat: PostgreSQL aktif, `npx prisma migrate dev` sudah dijalankan, DATABASE_URL terisi.
 * Gunakan database PENGUJIAN, bukan produksi. Data uji dibuat dengan ID unik dan dibersihkan di akhir.
 * Jalankan: `npm run test:integration` (otomatis dilewati bila DATABASE_URL tidak diatur).
 */
import "dotenv/config";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { accountBalances } from "../src/lib/finance";

const enabled = Boolean(process.env.DATABASE_URL);

describe(
  "integrasi database PFMS",
  { skip: !enabled && "DATABASE_URL tidak diatur" },
  () => {
    let db: PrismaClient;
    const userId = randomUUID();
    const kasId = randomUUID();
    const bankId = randomUUID();
    const catId = randomUUID();
    const txExpense = randomUUID();
    const txTransfer = randomUUID();
    const email = `it-${userId}@pfms.test`;

    const exec = (sql: string, ...params: unknown[]) =>
      db.$executeRawUnsafe(sql, ...params);
    const query = <T = Record<string, unknown>>(
      sql: string,
      ...params: unknown[]
    ) => db.$queryRawUnsafe<T[]>(sql, ...params);
    const count = async (sql: string, ...params: unknown[]) =>
      Number((await query<{ n: number }>(sql, ...params))[0].n);

    before(async () => {
      db = new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
      });
      await exec(
        `INSERT INTO users (id, name, email, role, updated_at) VALUES ($1::uuid, 'Integration Test', $2, 'AUDITOR', now())`,
        userId,
        email,
      );
      await exec(
        `INSERT INTO financial_accounts (id, user_id, name, type, initial_balance) VALUES
      ($1::uuid, $3::uuid, 'Kas IT', 'CASH', 1000000), ($2::uuid, $3::uuid, 'Bank IT', 'BANK', 0)`,
        kasId,
        bankId,
        userId,
      );
      await exec(
        `INSERT INTO categories (id, owner_id, name, type) VALUES ($1::uuid, $2::uuid, 'Makan IT', 'EXPENSE')`,
        catId,
        userId,
      );
    });

    after(async () => {
      await exec(`DELETE FROM transactions WHERE user_id = $1::uuid`, userId);
      await exec(`DELETE FROM audit_logs WHERE actor_id = $1::uuid`, userId);
      await exec(
        `DELETE FROM financial_accounts WHERE user_id = $1::uuid`,
        userId,
      );
      await exec(`DELETE FROM categories WHERE owner_id = $1::uuid`, userId);
      await exec(`DELETE FROM users WHERE id = $1::uuid`, userId);
      await db.$disconnect();
    });

    it("IT-01 enum UserRole memuat ADMIN, AUDITOR, USER dan AUDITOR dapat disimpan", async () => {
      const labels = (
        await query<{ enumlabel: string }>(
          `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'UserRole'`,
        )
      ).map((r) => r.enumlabel);
      for (const role of ["ADMIN", "AUDITOR", "USER"])
        assert.ok(labels.includes(role), `role ${role} hilang`);
      assert.equal(
        await count(
          `SELECT count(*)::int AS n FROM users WHERE id = $1::uuid AND role = 'AUDITOR'`,
          userId,
        ),
        1,
      );
    });

    it("IT-02 objek SQL Unit 2 terpasang (view, function, procedure, trigger)", async () => {
      const views = await count(
        `SELECT count(*)::int AS n FROM pg_views WHERE viewname IN ('v_transaction_details','v_active_accounts')`,
      );
      const procs =
        await count(`SELECT count(*)::int AS n FROM pg_proc WHERE proname IN
      ('fn_monthly_category_expense','fn_users_over_limit','sp_count_users_over_limit','sp_show_users_over_limit','fn_audit_transaction')`);
      const trg = await count(
        `SELECT count(*)::int AS n FROM pg_trigger WHERE tgname = 'trg_transaction_audit' AND NOT tgisinternal`,
      );
      assert.equal(views, 2);
      assert.equal(procs, 5);
      assert.equal(trg, 1);
    });

    it("IT-03 trigger mencatat CREATE, UPDATE, dan DELETE transaksi", async () => {
      const id = randomUUID();
      await exec(
        `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, occurred_at)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'EXPENSE', 10000, '2026-11-02T10:00:00+07')`,
        id,
        userId,
        kasId,
        catId,
      );
      await exec(
        `UPDATE transactions SET amount = 12000 WHERE id = $1::uuid`,
        id,
      );
      await exec(`DELETE FROM transactions WHERE id = $1::uuid`, id);
      const actions = (
        await query<{ action: string }>(
          `SELECT action FROM audit_logs WHERE entity_id = $1 ORDER BY created_at, action`,
          id,
        )
      )
        .map((r) => r.action)
        .sort();
      assert.deepEqual(actions, ["CREATE", "DELETE", "UPDATE"]);
    });

    it("IT-04 view, function, dan procedure konsisten dengan data transaksi", async () => {
      await exec(
        `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, occurred_at)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'EXPENSE', 150000, '2026-11-05T12:00:00+07')`,
        txExpense,
        userId,
        kasId,
        catId,
      );
      await exec(
        `INSERT INTO transactions (id, user_id, account_id, destination_account_id, type, amount, occurred_at)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'TRANSFER', 50000, '2026-11-06T09:00:00+07')`,
        txTransfer,
        userId,
        kasId,
        bankId,
      );

      const view = await query<{ category_name: string }>(
        `SELECT category_name FROM v_transaction_details WHERE transaction_id = $1::uuid`,
        txExpense,
      );
      assert.equal(view[0]?.category_name, "Makan IT");

      const monthly = await query<{ total_expense: string }>(
        `SELECT total_expense::text FROM fn_monthly_category_expense($1::uuid, 2026, 11) WHERE category_id = $2::uuid`,
        userId,
        catId,
      );
      assert.equal(Number(monthly[0].total_expense), 150000);

      const under = await count(
        `SELECT count(*)::int AS n FROM fn_users_over_limit(2026, 11, 100000) WHERE user_id = $1::uuid`,
        userId,
      );
      const over = await count(
        `SELECT count(*)::int AS n FROM fn_users_over_limit(2026, 11, 200000) WHERE user_id = $1::uuid`,
        userId,
      );
      assert.equal(under, 1);
      assert.equal(over, 0);

      await exec(`CALL sp_show_users_over_limit(2026, 11, 100000)`);
    });

    it("IT-05 saldo dari data DB dihitung benar oleh finance.ts", async () => {
      const rows = await query<{
        type: "INCOME" | "EXPENSE" | "TRANSFER";
        amount: number;
        account_id: string;
        destination_account_id: string | null;
      }>(
        `SELECT type::text AS type, amount::float8 AS amount, account_id::text AS account_id, destination_account_id::text AS destination_account_id
         FROM transactions WHERE user_id = $1::uuid`,
        userId,
      );
      const balances = accountBalances(
        [
          { id: kasId, initialBalance: 1_000_000 },
          { id: bankId, initialBalance: 0 },
        ],
        rows.map((r) => ({
          type: r.type,
          amount: r.amount,
          accountId: r.account_id,
          destinationAccountId: r.destination_account_id,
        })),
      );
      assert.equal(balances.get(kasId), 800_000); // 1.000.000 - 150.000 - 50.000
      assert.equal(balances.get(bankId), 50_000);
    });

    it("IT-06 ROLLBACK membatalkan insert pada transaksi database", async () => {
      const before = await count(
        `SELECT count(*)::int AS n FROM transactions WHERE user_id = $1::uuid`,
        userId,
      );
      await assert.rejects(
        db.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, occurred_at)
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'EXPENSE', 1, now())`,
            randomUUID(),
            userId,
            kasId,
            catId,
          );
          throw new Error("batalkan");
        }),
        /batalkan/,
      );
      assert.equal(
        await count(
          `SELECT count(*)::int AS n FROM transactions WHERE user_id = $1::uuid`,
          userId,
        ),
        before,
      );
    });

    it("IT-07 FK RESTRICT mencegah hapus akun yang sudah dipakai transaksi", async () => {
      await assert.rejects(
        exec(`DELETE FROM financial_accounts WHERE id = $1::uuid`, kasId),
      );
    });
  },
);
