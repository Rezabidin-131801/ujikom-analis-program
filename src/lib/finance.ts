/** Fungsi domain murni agar mudah diuji tanpa koneksi database. */
export type TransactionKind = "INCOME" | "EXPENSE" | "TRANSFER";
export interface LedgerEntry {
  type: TransactionKind;
  amount: number;
  accountId: string;
  destinationAccountId?: string | null;
}
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
export function validatePositiveAmount(amount: number): boolean {
  return (
    Number.isFinite(amount) &&
    amount > 0 &&
    Number.isSafeInteger(Math.round(amount * 100))
  );
}

/** Hitung seluruh saldo dalam satu lintasan transaksi: O(A + T). */
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
