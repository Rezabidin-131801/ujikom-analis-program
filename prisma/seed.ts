import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const prisma = new PrismaClient({ adapter });

async function main() {
  const password = process.env.ACC_PASSWORD;

  if (!password) {
    throw new Error("ACC_PASSWORD belum diatur pada file .env");
  }

  if (password.length < 8) {
    throw new Error("ACC_PASSWORD minimal 8 karakter.");
  }

  const users = [
    { name: "Admin PFMS", email: "admin@pfms.local", role: "ADMIN" as const },
    { name: "Demo User", email: "user@pfms.local", role: "USER" as const },
    {
      name: "Auditor PFMS",
      email: "auditor@pfms.local",
      role: "AUDITOR" as const,
    },
  ];

  // Hash password menggunakan mekanisme Better Auth.
  const passwordHash = await hashPassword(password);

  for (const item of users) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        name: item.name,
        role: item.role,
        isActive: true,
        emailVerified: true,
      },
      create: {
        name: item.name,
        email: item.email,
        role: item.role,
        isActive: true,
        emailVerified: true,
      },
    });

    // Buat atau perbarui credential Better Auth.
    const existingAccount = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: passwordHash, accountId: user.id },
      });
    } else {
      await prisma.account.create({
        data: {
          id: randomUUID(),
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: passwordHash,
        },
      });
    }

    console.log(`User seeded: ${user.email} (${user.role})`);

    // Seed kategori dan rekening hanya untuk Demo User.
    if (item.role === "USER") {
      const categories = [
        { name: "Gaji", type: "INCOME" as const },
        { name: "Bonus", type: "INCOME" as const },
        { name: "Makanan", type: "EXPENSE" as const },
        { name: "Transportasi", type: "EXPENSE" as const },
        { name: "Tagihan", type: "EXPENSE" as const },
        { name: "Hiburan", type: "EXPENSE" as const },
      ];

      for (const category of categories) {
        const existing = await prisma.category.findFirst({
          where: { name: category.name, type: category.type, ownerId: null },
        });

        if (!existing) {
          await prisma.category.create({
            data: { name: category.name, type: category.type },
          });
        }
      }

      await prisma.financialAccount.upsert({
        where: { userId_name: { userId: user.id, name: "Cash" } },
        update: {},
        create: {
          userId: user.id,
          name: "Cash",
          type: "CASH",
          initialBalance: 100000,
        },
      });

      console.log("Demo User categories and account seeded.");
    }
  }

  console.log("Database seeding completed.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
