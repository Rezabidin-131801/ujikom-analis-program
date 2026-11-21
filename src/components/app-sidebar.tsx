"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./sidebar";

export default function AppSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="min-h-screen lg:pl-64">
        {/* Header mobile */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 hover:bg-gray-100"
            aria-label="Buka menu"
          >
            <Menu size={22} />
          </button>

          <span className="ml-3 font-semibold">PFMS</span>
        </header>

        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}