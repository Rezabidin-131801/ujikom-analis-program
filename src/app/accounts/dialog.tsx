"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addAccount, updateAccount } from "@/app/actions";

export type AccountType = "CASH" | "BANK" | "E_WALLET";

export type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  isActive: boolean;
};

export const TYPE_LABEL: Record<AccountType, string> = {
  CASH: "Cash",
  BANK: "Bank",
  E_WALLET: "E-Wallet",
};

/** Form tambah/perbarui akun. Berada di dalam popup sehingga state-nya otomatis reset saat dialog dibuka ulang. */
function AccountForm({
  account,
  onDone,
}: {
  account?: AccountRow;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await (account ? updateAccount(fd) : addAccount(fd));
        onDone();
      } catch {
        setError(
          "Gagal menyimpan akun. Pastikan data valid dan nama akun belum dipakai akun lain.",
        );
      }
    });
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {account && <input type="hidden" name="id" value={account.id} />}
      <label>
        Nama akun
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={account?.name}
        />
      </label>
      <label>
        Jenis
        <select name="type" defaultValue={account?.type ?? "CASH"}>
          {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Saldo awal
        <input
          name="balance"
          type="number"
          min="0"
          step="0.01"
          defaultValue={account?.initialBalance ?? 0}
        />
      </label>
      {error && <p className="negative">{error}</p>}
      <DialogFooter>
        <button
          type="button"
          onClick={onDone}
          className="bg-muted! text-foreground!"
        >
          Batal
        </button>
        <button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
      </DialogFooter>
    </form>
  );
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountRow;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {account ? "Perbarui akun" : "Tambah keuangan baru"}
          </DialogTitle>
          <DialogDescription>
            {account
              ? "Ubah nama, jenis, atau saldo awal akun."
              : "Isi data akun keuangan yang ingin dicatat."}
          </DialogDescription>
        </DialogHeader>
        <AccountForm
          key={account?.id ?? "new"}
          account={account}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function AddAccountButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        + Tambah Keuangan baru
      </button>
      <AccountFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
