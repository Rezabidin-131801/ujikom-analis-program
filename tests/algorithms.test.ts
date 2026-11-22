import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeSort,
  linearSearch,
  binarySearch,
  compareText,
} from "../src/lib/algorithms";
import {
  accountBalance,
  summarize,
  validatePositiveAmount,
} from "../src/lib/finance";

test("mergeSort mengurutkan angka dan tidak mengubah input", () => {
  const input = [5, -1, 3, 3, 0];
  assert.deepEqual(
    mergeSort(input, (a, b) => a - b),
    [-1, 0, 3, 3, 5],
  );
  assert.deepEqual(input, [5, -1, 3, 3, 0]);
});
test("mergeSort stabil untuk key yang sama", () => {
  const data = [
    { k: 1, id: "a" },
    { k: 0, id: "b" },
    { k: 1, id: "c" },
  ];
  assert.deepEqual(
    mergeSort(data, (a, b) => a.k - b.k).map((x) => x.id),
    ["b", "a", "c"],
  );
});
test("linearSearch mengembalikan indeks atau -1", () => {
  assert.equal(
    linearSearch(["a", "b", "c"], (x) => x === "b"),
    1,
  );
  assert.equal(
    linearSearch(["a", "b"], (x) => x === "z"),
    -1,
  );
});
test("binarySearch menemukan duplikat pertama dan menangani kosong", () => {
  const a = [1, 2, 2, 2, 5];
  assert.equal(
    binarySearch(a, 2, (x, y) => x - y),
    1,
  );
  assert.equal(
    binarySearch(a, 4, (x, y) => x - y),
    -1,
  );
  assert.equal(
    binarySearch([], 1, (x, y) => x - y),
    -1,
  );
});
test("compareText tidak sensitif kapital dan mendukung angka", () => {
  assert.equal(compareText("Akun 2", "akun 10") < 0, true);
});
test("saldo memperhitungkan income, expense, dan transfer dua sisi", () => {
  const rows = [
    { type: "INCOME" as const, amount: 100, accountId: "A" },
    { type: "EXPENSE" as const, amount: 20, accountId: "A" },
    {
      type: "TRANSFER" as const,
      amount: 30,
      accountId: "A",
      destinationAccountId: "B",
    },
  ];
  assert.equal(accountBalance(10, "A", rows), 60);
  assert.equal(accountBalance(0, "B", rows), 30);
});
test("ringkasan arus kas tidak menghitung transfer", () => {
  assert.deepEqual(
    summarize([
      { type: "INCOME", amount: 50, accountId: "A" },
      { type: "EXPENSE", amount: 20, accountId: "A" },
      {
        type: "TRANSFER",
        amount: 10,
        accountId: "A",
        destinationAccountId: "B",
      },
    ]),
    { income: 50, expense: 20 },
  );
});
test("validasi nominal menolak nol, negatif, NaN dan Infinity", () => {
  assert.equal(validatePositiveAmount(1), true);
  for (const value of [0, -1, NaN, Infinity])
    assert.equal(validatePositiveAmount(value), false);
});

import { accountBalances } from "../src/lib/finance";
test("accountBalances menghitung seluruh akun dalam satu lintasan", () => {
  const result = accountBalances(
    [
      { id: "A", initialBalance: 100 },
      { id: "B", initialBalance: 5 },
    ],
    [
      { type: "EXPENSE", amount: 10, accountId: "A" },
      {
        type: "TRANSFER",
        amount: 25,
        accountId: "A",
        destinationAccountId: "B",
      },
      { type: "INCOME", amount: 7, accountId: "B" },
    ],
  );
  assert.deepEqual(
    [...result.entries()],
    [
      ["A", 65],
      ["B", 37],
    ],
  );
});
