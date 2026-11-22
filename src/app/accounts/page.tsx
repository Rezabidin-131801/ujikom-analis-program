import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AddAccountButton } from "./dialog";
import { AccountsTable } from "./column";

export default async function Accounts() {
  const u = await currentUser();
  if (!u) redirect("/login");
  const accounts = await prisma.financialAccount.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" },
  });

  const rows = accounts.map((acc) => ({
    id: acc.id,
    name: acc.name,
    type: acc.type,
    initialBalance: Number(acc.initialBalance),
    isActive: acc.isActive,
  }));
  return (
    <main className="wrap">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1>Akun Keuangan</h1>
        <AddAccountButton />
      </div>
      <section className="card">
        <AccountsTable rows={rows} />
      </section>
    </main>
  );
}
