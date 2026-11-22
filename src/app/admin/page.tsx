import { redirect } from "next/navigation";

import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createUserAction } from "./actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminPageProps = { searchParams: Promise<{ status?: string }> };

const statusMessages: Record<string, string> = {
  created: "Pengguna berhasil dibuat.",
  "invalid-name": "Nama pengguna tidak valid.",
  "invalid-email": "Format email tidak valid.",
  "invalid-password": "Password harus 8–128 karakter.",
  "password-mismatch": "Konfirmasi password tidak cocok.",
  "invalid-role": "Role pengguna tidak valid.",
  "email-exists": "Email sudah terdaftar.",
  "create-failed": "Gagal membuat pengguna.",
};

export default async function Admin({ searchParams }: AdminPageProps) {
  const u = await currentUser();

  if (!u) redirect("/login");
  const isAdmin = u.role === "ADMIN";
  // ADMIN: akses penuh. AUDITOR: hanya melihat (read-only). USER: ditolak.
  if (!isAdmin && u.role !== "AUDITOR") redirect("/dashboard");

  const params = await searchParams;

  const [users, count, cats, logs] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.transaction.count(),

    prisma.category.findMany({ where: { ownerId: null } }),

    prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
  ]);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel Admin</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Kelola pengguna dan data sistem PFMS."
            : "Mode auditor: hanya dapat melihat data (read-only)."}
        </p>
      </div>

      {/* Notifikasi */}
      {params.status && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            params.status === "created"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {statusMessages[params.status] ?? "Terjadi kesalahan."}
        </div>
      )}

      {/* Statistik */}
      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Pengguna</p>
          <p className="mt-2 text-3xl font-bold">{users.length}</p>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Transaksi</p>
          <p className="mt-2 text-3xl font-bold">{count}</p>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Kategori Global</p>
          <p className="mt-2 text-3xl font-bold">{cats.length}</p>
        </section>
      </div>

      {/* Form Tambah Pengguna (hanya ADMIN) */}
      {isAdmin && (
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Tambah Pengguna</h2>
            <p className="text-sm text-muted-foreground">
              Buat akun baru agar pengguna dapat login ke PFMS.
            </p>
          </div>

          <form action={createUserAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                name="name"
                placeholder="Masukkan nama lengkap"
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nama@email.com"
                maxLength={255}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimal 8 karakter"
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Ulangi password"
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="role">Hak Akses</Label>
              <select
                id="role"
                name="role"
                defaultValue="USER"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="USER">User</option>
                <option value="AUDITOR">Auditor (read-only)</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Tambah Pengguna</Button>
            </div>
          </form>
        </section>
      )}

      {/* Daftar Pengguna */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Daftar Pengguna</h2>
          <p className="text-sm text-muted-foreground">
            Pengguna yang terdaftar pada sistem PFMS.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-3">Nama</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Tanggal Dibuat</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="px-3 py-3 font-medium">{user.name}</td>

                  <td className="px-3 py-3">{user.email}</td>

                  <td className="px-3 py-3">{user.role}</td>

                  <td className="px-3 py-3">
                    {user.isActive ? (
                      <span className="text-green-600">Aktif</span>
                    ) : (
                      <span className="text-red-600">Nonaktif</span>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {user.createdAt.toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Belum ada pengguna.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Log (20 terbaru) */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Audit Log Terbaru</h2>
          <p className="text-sm text-muted-foreground">
            Aktivitas transaksi dicatat oleh trigger database.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-3">Waktu</th>
                <th className="px-3 py-3">Pelaku</th>
                <th className="px-3 py-3">Aksi</th>
                <th className="px-3 py-3">Entitas</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="px-3 py-3">
                    {log.createdAt.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3">{log.actor.name}</td>
                  <td className="px-3 py-3">{log.action}</td>
                  <td className="px-3 py-3">{log.entityType}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Belum ada aktivitas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
