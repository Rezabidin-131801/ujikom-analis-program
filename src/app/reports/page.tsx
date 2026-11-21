import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const u = await currentUser();
  if (!u) redirect("/login");
  const q = await searchParams,
    n = new Date(),
    year = Number(q.year) || n.getFullYear(),
    month = Number(q.month) || n.getMonth() + 1,
    start = new Date(year, month - 1, 1),
    end = new Date(year, month, 1),
    rows = await prisma.transaction.findMany({
      where: { userId: u.id, occurredAt: { gte: start, lt: end } },
      include: { category: true },
      orderBy: { occurredAt: "desc" },
    });
  const income = rows
      .filter((x) => x.type === "INCOME")
      .reduce((s, x) => s + Number(x.amount), 0),
    expense = rows
      .filter((x) => x.type === "EXPENSE")
      .reduce((s, x) => s + Number(x.amount), 0);
  return (
    <main className="wrap">
      <h1>Laporan keuangan</h1>
      <form className="card" style={{ display: "flex", gap: 10 }}>
        <input
          name="month"
          type="number"
          min="1"
          max="12"
          defaultValue={month}
        />
        <input name="year" type="number" defaultValue={year} />
        <button>Filter</button>
      </form>
      <div className="grid">
        <section className="card">
          Pemasukan
          <div className="big positive">
            Rp {income.toLocaleString("id-ID")}
          </div>
        </section>
        <section className="card">
          Pengeluaran
          <div className="big negative">
            Rp {expense.toLocaleString("id-ID")}
          </div>
        </section>
        <section className="card">
          Selisih
          <div className="big">
            Rp {(income - expense).toLocaleString("id-ID")}
          </div>
        </section>
      </div>
      <section className="card">
        <h2>Rincian transaksi</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Kategori</th>
              <th>Nominal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{t.occurredAt.toLocaleDateString("id-ID")}</td>
                <td>{t.type}</td>
                <td>{t.category?.name || "Transfer"}</td>
                <td>Rp {Number(t.amount).toLocaleString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
