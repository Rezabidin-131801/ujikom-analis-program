"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Tags,
  ChartNoAxesCombined,
  Target,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import LogoutButton from "./logout";

const menuItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Transaksi", href: "/transactions", icon: ArrowLeftRight },
  { title: "Rekening", href: "/accounts", icon: Wallet },
  { title: "Kategori", href: "/categories", icon: Tags },
  { title: "Anggaran", href: "/budgets", icon: Target },
  { title: "Laporan", href: "/reports", icon: ChartNoAxesCombined },
];

type SidebarProps = { open?: boolean; onClose?: () => void };

export default function Sidebar({ open = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay untuk tampilan mobile */}
      {open && (
        <button
          type="button"
          aria-label="Tutup sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link href="/dashboard" className="text-xl font-bold">
            PFMS
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 hover:bg-gray-100 lg:hidden"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Menu Utama
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon size={19} />
                {item.title}
              </Link>
            );
          })}

          <div className="pt-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Pengaturan
            </p>

            <Link
              href="/settings"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                pathname.startsWith("/settings")
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Settings size={19} />
              Pengaturan
            </Link>
          </div>
        </nav>

        {/* Logout */}
        <div className="border-t p-3">
          <form action="/api/auth/sign-out" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogoutButton />
              Keluar
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
