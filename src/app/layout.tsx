import "./globals.css";
import Link from "next/link";
import { currentUser, clearSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});


async function logout() {
  "use server";
  await clearSession();
  redirect("/login");
}
export const metadata = { title: "PFMS - Personal Finance Management" };
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  return (
    <html lang="id" className={cn("font-sans", inter.variable)}>
      <body>
        <header className="nav">
          <div className="navin">
            <Link className="brand" href="/">
              PFMS
            </Link>
            <nav className="links">
              {user ? (
                <>
                  <Link href="/dashboard">Dashboard</Link>
                  <Link href="/accounts">Akun</Link>
                  <Link href="/transactions">Transaksi</Link>
                  <Link href="/budgets">Anggaran</Link>
                  <Link href="/reports">Laporan</Link>
                  {user.role === "ADMIN" && <Link href="/admin">Admin</Link>}
                  <span className="muted">{user.name}</span>
                  <form action={logout}>
                    <button>Keluar</button>
                  </form>
                </>
              ) : (
                <Link href="/login">Login</Link>
              )}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
