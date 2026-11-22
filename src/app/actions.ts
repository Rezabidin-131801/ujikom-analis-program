"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clearSession, currentUser } from "@/lib/session";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function loginAction(fd: FormData) {
  const email = String(fd.get("email") || "")
    .toLowerCase()
    .trim();

  const password = String(fd.get("password") || "");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { isActive: true },
  });

  if (!user || !user.isActive) {
    redirect("/login?error=1");
  }

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch {
    redirect("/login?error=1");
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

async function authentication() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function addAccount(fd: FormData) {
  const u = await authentication();
  const name = String(fd.get("name") || "").trim(),
    type = String(fd.get("type") || ""),
    balance = Number(fd.get("balance") || 0);

  if (
    !name ||
    !["CASH", "BANK", "E_WALLET"].includes(type) ||
    !Number.isFinite(balance) ||
    balance < 0
  )
    throw new Error("Data akun tidak valid");

  await prisma.financialAccount.create({
    data: { userId: u.id, name, type: type as any, initialBalance: balance },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function addCategory(fd: FormData) {
  const u = await authentication();
  const name = String(fd.get("name") || "").trim(),
    type = String(fd.get("type") || "");

  if (!name || !["INCOME", "EXPENSE"].includes(type))
    throw new Error("Kategori tidak valid");

  await prisma.category.create({
    data: { ownerId: u.id, name, type: type as any },
  });

  revalidatePath("/transactions");
  revalidatePath("/budgets");
}

export async function addTransaction(fd: FormData) {
  const u = await authentication();
  const type = String(fd.get("type") || ""),
    accountId = String(fd.get("accountId") || ""),
    destinationId = String(fd.get("destinationId") || "") || null,
    categoryId = String(fd.get("categoryId") || "") || null,
    amount = Number(fd.get("amount")),
    date = new Date(String(fd.get("date") || ""));

  if (
    !["INCOME", "EXPENSE", "TRANSFER"].includes(type) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    isNaN(date.getTime())
  )
    throw new Error("Transaksi tidak valid");

  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId: u.id, isActive: true },
  });

  if (!account) throw new Error("Akun tidak ditemukan");

  if (type === "TRANSFER") {
    if (!destinationId || destinationId === accountId)
      throw new Error("Tujuan transfer tidak valid");
    const dest = await prisma.financialAccount.findFirst({
      where: { id: destinationId, userId: u.id, isActive: true },
    });
    if (!dest) throw new Error("Akun tujuan tidak valid");
  } else {
    if (!categoryId) throw new Error("Kategori wajib dipilih");

    const cat = await prisma.category.findFirst({
      where: {
        id: categoryId,
        type: type as any,
        isActive: true,
        OR: [{ ownerId: null }, { ownerId: u.id }],
      },
    });

    if (!cat) throw new Error("Kategori tidak sesuai");
  }

  await prisma.transaction.create({
    data: {
      userId: u.id,
      accountId,
      destinationAccountId: type === "TRANSFER" ? destinationId : null,
      categoryId: type === "TRANSFER" ? null : categoryId,
      type: type as any,
      amount,
      occurredAt: date,
      description: String(fd.get("description") || ""),
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/reports");
}

export async function saveBudget(fd: FormData) {
  const u = await authentication();
  const categoryId = String(fd.get("categoryId") || ""),
    year = Number(fd.get("year")),
    month = Number(fd.get("month")),
    amount = Number(fd.get("amount"));
  const cat = await prisma.category.findFirst({
    where: {
      id: categoryId,
      type: "EXPENSE",
      OR: [{ ownerId: null }, { ownerId: u.id }],
    },
  });

  if (
    !cat ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    !Number.isFinite(amount) ||
    amount <= 0
  )
    throw new Error("Anggaran tidak valid");

  await prisma.budget.upsert({
    where: {
      userId_categoryId_year_month: { userId: u.id, categoryId, year, month },
    },
    update: { amount },
    create: { userId: u.id, categoryId, year, month, amount },
  });

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function updateAccount(fd: FormData) {
  const u = await authentication(),
    id = String(fd.get("id") || ""),
    name = String(fd.get("name") || "").trim();
  const type = String(fd.get("type") || ""),
    balance = Number(fd.get("balance"));
  if (
    !id ||
    !name ||
    name.length > 100 ||
    !["CASH", "BANK", "E_WALLET"].includes(type) ||
    !Number.isFinite(balance) ||
    balance < 0
  )
    throw new Error("Data akun tidak valid");

  const owned = await prisma.financialAccount.findFirst({
    where: { id, userId: u.id },
  });

  if (!owned) throw new Error("Akun tidak ditemukan");
  await prisma.financialAccount.update({
    where: { id },
    data: { name, type: type as any, initialBalance: balance },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function deleteAccount(fd: FormData) {
  const u = await authentication(),
    id = String(fd.get("id") || "");
  const owned = await prisma.financialAccount.findFirst({
    where: { id, userId: u.id },
  });

  if (!owned) throw new Error("Akun tidak ditemukan");

  const usage = await prisma.transaction.count({
    where: {
      userId: u.id,
      OR: [{ accountId: id }, { destinationAccountId: id }],
    },
  });

  if (usage)
    await prisma.financialAccount.update({
      where: { id },
      data: { isActive: false },
    });
  else await prisma.financialAccount.delete({ where: { id } });

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function updateCategory(fd: FormData) {
  const u = await authentication(),
    id = String(fd.get("id") || ""),
    name = String(fd.get("name") || "").trim(),
    type = String(fd.get("type") || "");

  if (!id || !name || name.length > 60 || !["INCOME", "EXPENSE"].includes(type))
    throw new Error("Kategori tidak valid");
  const owned = await prisma.category.findFirst({
    where: { id, ownerId: u.id },
  });

  if (!owned) throw new Error("Kategori pribadi tidak ditemukan");
  const used = await prisma.transaction.count({
    where: { userId: u.id, categoryId: id },
  });

  if (used && owned.type !== type)
    throw new Error("Jenis kategori tidak dapat diubah karena sudah digunakan");
  await prisma.category.update({
    where: { id },
    data: { name, type: type as any },
  });

  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/reports");
}

export async function deleteCategory(fd: FormData) {
  const u = await authentication(),
    id = String(fd.get("id") || "");
  const owned = await prisma.category.findFirst({
    where: { id, ownerId: u.id },
  });

  if (!owned) throw new Error("Kategori pribadi tidak ditemukan");
  const [txCount, budgetCount] = await Promise.all([
    prisma.transaction.count({ where: { userId: u.id, categoryId: id } }),
    prisma.budget.count({ where: { userId: u.id, categoryId: id } }),
  ]);

  if (txCount || budgetCount)
    await prisma.category.update({ where: { id }, data: { isActive: false } });
  else await prisma.category.delete({ where: { id } });

  revalidatePath("/transactions");
  revalidatePath("/budgets");
}

export async function updateTransaction(fd: FormData) {
  const u = await authentication(),
    id = String(fd.get("id") || ""),
    type = String(fd.get("type") || "");
  const accountId = String(fd.get("accountId") || ""),
    destinationId = String(fd.get("destinationId") || "") || null;
  const categoryId = String(fd.get("categoryId") || "") || null,
    amount = Number(fd.get("amount"));
  const date = new Date(String(fd.get("date") || ""));

  if (
    !id ||
    !["INCOME", "EXPENSE", "TRANSFER"].includes(type) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isFinite(date.getTime())
  )
    throw new Error("Transaksi tidak valid");

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: u.id },
  });

  if (!existing) throw new Error("Transaksi tidak ditemukan");

  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId: u.id, isActive: true },
  });

  if (!account) throw new Error("Akun sumber tidak valid");

  if (type === "TRANSFER") {
    if (!destinationId || destinationId === accountId)
      throw new Error("Tujuan transfer tidak valid");

    const dest = await prisma.financialAccount.findFirst({
      where: { id: destinationId, userId: u.id, isActive: true },
    });

    if (!dest) throw new Error("Akun tujuan tidak valid");
  } else {
    if (!categoryId) throw new Error("Kategori wajib dipilih");

    const cat = await prisma.category.findFirst({
      where: {
        id: categoryId,
        type: type as any,
        isActive: true,
        OR: [{ ownerId: null }, { ownerId: u.id }],
      },
    });

    if (!cat) throw new Error("Kategori tidak sesuai");
  }

  await prisma.transaction.update({
    where: { id },
    data: {
      type: type as any,
      accountId,
      destinationAccountId: type === "TRANSFER" ? destinationId : null,
      categoryId: type === "TRANSFER" ? null : categoryId,
      amount,
      occurredAt: date,
      description: String(fd.get("description") || ""),
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/reports");
}

export async function deleteTransaction(fd: FormData) {
  const u = await authentication(),
    id = String(fd.get("id") || "");
  const row = await prisma.transaction.findFirst({
    where: { id, userId: u.id },
    select: { id: true },
  });

  if (!row) throw new Error("Transaksi tidak ditemukan");

  await prisma.transaction.delete({ where: { id } });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/reports");
}

export async function deleteBudget(fd: FormData) {
  const u = await authentication(),
    id = String(fd.get("id") || "");
  const row = await prisma.budget.findFirst({
    where: { id, userId: u.id },
    select: { id: true },
  });

  if (!row) throw new Error("Anggaran tidak ditemukan");

  await prisma.budget.delete({ where: { id } });

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}
