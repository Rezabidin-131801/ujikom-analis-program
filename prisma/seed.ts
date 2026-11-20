import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  for (const x of [
    {
      name: "Admin PFMS",
      email: "admin@pfms.local",
      password: "Admin12345!",
      role: "ADMIN" as const,
    },
    {
      name: "Demo User",
      email: "user@pfms.local",
      password: "User12345!",
      role: "USER" as const,
    },
  ]) {
    const u = await prisma.user.upsert({
      where: { email: x.email },
      update: {},
      create: {
        name: x.name,
        email: x.email,
        passwordHash: await bcrypt.hash(x.password, 12),
        role: x.role,
      },
    });
    if (x.role === "USER") {
      for (const [name, type] of [
        ["Gaji", "INCOME"],
        ["Bonus", "INCOME"],
        ["Makanan", "EXPENSE"],
        ["Transportasi", "EXPENSE"],
        ["Tagihan", "EXPENSE"],
        ["Hiburan", "EXPENSE"],
      ] as const) {
        if (
          !(await prisma.category.findFirst({
            where: { name, type, ownerId: null },
          }))
        )
          await prisma.category.create({ data: { name, type } });
      }
      if (
        !(await prisma.financialAccount.findFirst({
          where: { userId: u.id, name: "Cash" },
        }))
      )
        await prisma.financialAccount.create({
          data: {
            userId: u.id,
            name: "Cash",
            type: "CASH",
            initialBalance: 100000,
          },
        });
    }
  }
}
main().finally(() => prisma.$disconnect());
