import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addAccount, updateAccount, deleteAccount } from "@/app/actions";
export default async function Accounts() {
  const u = await currentUser();
  if (!u) redirect("/login");
  const rows = await prisma.financialAccount.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" },
  });
  return (
    <main className="wrap">
      <h1>Akun keuangan</h1>
      <div className="grid">
        <section className="card">
          <h2>Tambah akun</h2>
          <form className="form" action={addAccount}>
            <label>
              Nama akun
              <input name="name" required maxLength={100} />
            </label>
            <label>
              Jenis
              <select name="type">
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
                <option value="E_WALLET">E-Wallet</option>
              </select>
            </label>
            <label>
              Saldo awal
              <input
                name="balance"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
              />
            </label>
            <button>Simpan</button>
          </form>
        </section>
        <section className="card">
          <h2>Daftar akun</h2>
          {rows.map((a) => (
            <div key={a.id} className="item">
              <form className="form" action={updateAccount}>
                <input type="hidden" name="id" value={a.id} />
                <label>
                  Nama
                  <input name="name" defaultValue={a.name} required />
                </label>
                <label>
                  Jenis
                  <select name="type" defaultValue={a.type}>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="E_WALLET">E-Wallet</option>
                  </select>
                </label>
                <label>
                  Saldo awal
                  <input
                    name="balance"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={Number(a.initialBalance)}
                  />
                </label>
                <p>Status: {a.isActive ? "Aktif" : "Nonaktif"}</p>
                <button disabled={!a.isActive}>Perbarui</button>
              </form>
              <form action={deleteAccount}>
                <input type="hidden" name="id" value={a.id} />
                <button className="danger" disabled={!a.isActive}>
                  Hapus / nonaktifkan
                </button>
              </form>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
