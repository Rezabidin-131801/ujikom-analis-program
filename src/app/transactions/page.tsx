import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  addTransaction,
  addCategory,
  updateTransaction,
  deleteTransaction,
  updateCategory,
  deleteCategory,
} from "@/app/actions";
import { mergeSort, compareText, linearSearch } from "@/lib/algorithms";
export default async function Transactions({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
}) {
  const u = await currentUser();
  if (!u) redirect("/login");
  const params = await searchParams;
  const q = (params.q || "").trim().toLocaleLowerCase("id"),
    sort = params.sort || "date",
    desc = params.dir !== "asc";
  const [accounts, cats, found] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId: u.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { isActive: true, OR: [{ ownerId: null }, { ownerId: u.id }] },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      where: { userId: u.id },
      include: { account: true, category: true, destination: true },
    }),
  ]);
  const exactId = q.startsWith("id:") ? q.slice(3).trim() : "";
  const filtered = exactId
    ? (() => {
        const index = linearSearch(found, (t) => t.id === exactId);
        return index < 0 ? [] : [found[index]];
      })()
    : found.filter((t) =>
        [
          t.description || "",
          t.category?.name || "",
          t.account.name,
          t.destination?.name || "",
          t.type,
        ]
          .join(" ")
          .toLocaleLowerCase("id")
          .includes(q),
      );
  const rows = mergeSort(filtered, (a, b) => {
    let c =
      sort === "amount"
        ? Number(a.amount) - Number(b.amount)
        : sort === "type"
          ? compareText(a.type, b.type)
          : a.occurredAt.getTime() - b.occurredAt.getTime();
    return desc ? -c : c;
  });
  return (
    <main className="wrap">
      <h1>Transaksi</h1>
      <div className="grid">
        <section className="card">
          <h2>Tambah transaksi</h2>
          <form className="form" action={addTransaction}>
            <label>
              Jenis
              <select name="type">
                <option value="EXPENSE">Pengeluaran</option>
                <option value="INCOME">Pemasukan</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </label>
            <label>
              Akun sumber
              <select name="accountId" required>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Akun tujuan transfer
              <select name="destinationId">
                <option value="">Tidak digunakan</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kategori
              <select name="categoryId">
                <option value="">Pilih kategori</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nominal
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label>
              Tanggal
              <input
                name="date"
                type="datetime-local"
                defaultValue={new Date().toISOString().slice(0, 16)}
                required
              />
            </label>
            <label>
              Deskripsi
              <input name="description" maxLength={500} />
            </label>
            <button disabled={!accounts.length}>Simpan transaksi</button>
          </form>
        </section>
        <section className="card">
          <h2>Kategori pribadi</h2>
          <form className="form" action={addCategory}>
            <label>
              Nama kategori
              <input name="name" required maxLength={60} />
            </label>
            <label>
              Jenis
              <select name="type">
                <option value="EXPENSE">Pengeluaran</option>
                <option value="INCOME">Pemasukan</option>
              </select>
            </label>
            <button>Tambah kategori</button>
          </form>
          {cats
            .filter((c) => c.ownerId === u.id)
            .map((c) => (
              <div className="item" key={c.id}>
                <form className="form" action={updateCategory}>
                  <input type="hidden" name="id" value={c.id} />
                  <label>
                    Nama
                    <input name="name" defaultValue={c.name} />
                  </label>
                  <label>
                    Jenis
                    <select name="type" defaultValue={c.type}>
                      <option value="EXPENSE">Pengeluaran</option>
                      <option value="INCOME">Pemasukan</option>
                    </select>
                  </label>
                  <button>Perbarui kategori</button>
                </form>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="danger">Hapus / nonaktifkan</button>
                </form>
              </div>
            ))}
        </section>
      </div>
      <section className="card">
        <h2>Riwayat transaksi ({rows.length})</h2>
        <form className="toolbar">
          <input
            name="q"
            placeholder="Cari teks atau id:<UUID>..."
            defaultValue={params.q}
          />
          <select name="sort" defaultValue={sort}>
            <option value="date">Tanggal</option>
            <option value="amount">Nominal</option>
            <option value="type">Jenis</option>
          </select>
          <select name="dir" defaultValue={desc ? "desc" : "asc"}>
            <option value="desc">Menurun</option>
            <option value="asc">Menaik</option>
          </select>
          <button>Cari / urutkan</button>
        </form>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Keterangan</th>
                <th>Akun</th>
                <th>Nominal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>{t.occurredAt.toLocaleString("id-ID")}</td>
                  <td>{t.type}</td>
                  <td>
                    {t.description ||
                      t.category?.name ||
                      t.destination?.name ||
                      "-"}
                  </td>
                  <td>{t.account.name}</td>
                  <td>Rp {Number(t.amount).toLocaleString("id-ID")}</td>
                  <td>
                    <details>
                      <summary>Edit</summary>
                      <form className="form compact" action={updateTransaction}>
                        <input type="hidden" name="id" value={t.id} />
                        <label>
                          Jenis
                          <select name="type" defaultValue={t.type}>
                            <option value="INCOME">Pemasukan</option>
                            <option value="EXPENSE">Pengeluaran</option>
                            <option value="TRANSFER">Transfer</option>
                          </select>
                        </label>
                        <label>
                          Akun
                          <select name="accountId" defaultValue={t.accountId}>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Tujuan
                          <select
                            name="destinationId"
                            defaultValue={t.destinationAccountId || ""}
                          >
                            <option value="">-</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Kategori
                          <select
                            name="categoryId"
                            defaultValue={t.categoryId || ""}
                          >
                            <option value="">-</option>
                            {cats.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.type})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Nominal
                          <input
                            name="amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            defaultValue={Number(t.amount)}
                          />
                        </label>
                        <label>
                          Tanggal
                          <input
                            name="date"
                            type="datetime-local"
                            defaultValue={new Date(
                              t.occurredAt.getTime() -
                                t.occurredAt.getTimezoneOffset() * 60000,
                            )
                              .toISOString()
                              .slice(0, 16)}
                          />
                        </label>
                        <label>
                          Deskripsi
                          <input
                            name="description"
                            defaultValue={t.description || ""}
                          />
                        </label>
                        <button>Simpan perubahan</button>
                      </form>
                      <form action={deleteTransaction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button className="danger">Hapus transaksi</button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
