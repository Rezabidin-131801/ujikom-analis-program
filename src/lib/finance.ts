/**
 * @packageDocumentation
 * Fungsi domain murni agar mudah diuji tanpa koneksi database.
 */

/** Jenis transaksi: pemasukan, pengeluaran, atau transfer antar akun. */
export type TransactionKind = "INCOME" | "EXPENSE" | "TRANSFER";
/** Satu baris buku besar; `destinationAccountId` hanya terisi untuk TRANSFER. */
export interface LedgerEntry {
  type: TransactionKind;
  amount: number;
  accountId: string;
  destinationAccountId?: string | null;
}
/**
 * Menghitung saldo satu akun. INCOME menambah; EXPENSE dan TRANSFER keluar mengurangi;
 * TRANSFER masuk (akun tujuan) menambah. Kompleksitas O(T).
 *
 * @param initialBalance saldo awal akun
 * @param accountId akun yang dihitung
 * @param entries seluruh transaksi yang relevan
 * @returns saldo akhir akun
 */
export function accountBalance(
  initialBalance: number,
  accountId: string,
  entries: readonly LedgerEntry[],
): number {
  return entries.reduce((balance, entry) => {
    if (entry.accountId === accountId) {
      if (entry.type === "INCOME") return balance + entry.amount;
      return balance - entry.amount;
    }
    if (entry.type === "TRANSFER" && entry.destinationAccountId === accountId)
      return balance + entry.amount;
    return balance;
  }, initialBalance);
}
/**
 * Meringkas arus kas. Transfer diabaikan karena hanya memindahkan saldo antar akun.
 *
 * @returns total pemasukan dan pengeluaran
 */
export function summarize(entries: readonly LedgerEntry[]) {
  return entries.reduce(
    (result, entry) => {
      if (entry.type === "INCOME") result.income += entry.amount;
      if (entry.type === "EXPENSE") result.expense += entry.amount;
      return result;
    },
    { income: 0, expense: 0 },
  );
}
/**
 * Validasi nominal: harus berhingga, > 0, dan aman setelah dikali 100 (dua desimal).
 *
 * @returns `true` bila nominal valid
 */
export function validatePositiveAmount(amount: number): boolean {
  return (
    Number.isFinite(amount) &&
    amount > 0 &&
    Number.isSafeInteger(Math.round(amount * 100))
  );
}

/**
 * Menghitung seluruh saldo akun dalam satu lintasan transaksi: O(A + T).
 *
 * @param accounts daftar akun beserta saldo awal
 * @param entries seluruh transaksi
 * @returns peta `accountId` -> saldo akhir
 */
export function accountBalances(
  accounts: readonly { id: string; initialBalance: number }[],
  entries: readonly LedgerEntry[],
): Map<string, number> {
  const balances = new Map(
    accounts.map((account) => [account.id, account.initialBalance]),
  );
  for (const entry of entries) {
    if (balances.has(entry.accountId)) {
      if (entry.type === "INCOME")
        balances.set(
          entry.accountId,
          (balances.get(entry.accountId) || 0) + entry.amount,
        );
      else
        balances.set(
          entry.accountId,
          (balances.get(entry.accountId) || 0) - entry.amount,
        );
    }
    if (
      entry.type === "TRANSFER" &&
      entry.destinationAccountId &&
      balances.has(entry.destinationAccountId)
    ) {
      balances.set(
        entry.destinationAccountId,
        (balances.get(entry.destinationAccountId) || 0) + entry.amount,
      );
    }
  }
  return balances;
}
