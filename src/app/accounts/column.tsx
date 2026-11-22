"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createPaginatedRowModel,
  flexRender,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { SquarePen, Trash } from "lucide-react";
import { deleteAccount } from "@/app/actions";
import { AccountFormDialog, TYPE_LABEL, type AccountRow } from "./dialog";

const iconButton =
  "inline-flex size-8 items-center justify-center rounded-md bg-transparent! p-0! text-foreground! hover:bg-muted! disabled:cursor-not-allowed disabled:opacity-40";
const PAGE_SIZE = 5;
const pageButton =
  "px-3! py-1.5! text-sm! disabled:cursor-not-allowed disabled:opacity-40";

const features = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

export function AccountsTable({ rows }: { rows: AccountRow[] }) {
  const [editing, setEditing] = useState<AccountRow | undefined>();
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const lastPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
  const pageIndex = Math.min(pagination.pageIndex, lastPage);

  function handleEdit(row: AccountRow) {
    setEditing(row);
    setEditOpen(true);
  }

  function handleDelete(row: AccountRow) {
    const ok = window.confirm(
      `Hapus akun "${row.name}"? Akun yang sudah dipakai transaksi akan dinonaktifkan, bukan dihapus permanen.`,
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      try {
        await deleteAccount(fd);
      } catch {
        window.alert("Gagal menghapus akun.");
      }
    });
  }

  const columns = useMemo<ColumnDef<typeof features, AccountRow>[]>(
    () => [
      { accessorKey: "name", header: "Nama" },
      {
        accessorKey: "type",
        header: "Jenis",
        cell: ({ row }) => TYPE_LABEL[row.original.type],
      },
      {
        accessorKey: "initialBalance",
        header: "Saldo Awal",
        cell: ({ row }) =>
          `Rp ${row.original.initialBalance.toLocaleString("id-ID")}`,
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) =>
          row.original.isActive ? (
            <span className="pill">Aktif</span>
          ) : (
            <span className="muted">Nonaktif</span>
          ),
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => {
          const a = row.original;
          return (
            <div className="flex gap-1">
              <button
                type="button"
                className={iconButton}
                title="Perbarui"
                aria-label={`Perbarui akun ${a.name}`}
                disabled={!a.isActive || pending}
                onClick={() => handleEdit(a)}
              >
                <SquarePen className="size-4" />
              </button>
              <button
                type="button"
                className={`${iconButton} text-destructive!`}
                title="Hapus"
                aria-label={`Hapus akun ${a.name}`}
                disabled={!a.isActive || pending}
                onClick={() => handleDelete(a)}
              >
                <Trash className="size-4" />
              </button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending],
  );

  const table = useTable({
    features,
    data: rows,
    columns,
    state: { pagination: { pageIndex, pageSize: PAGE_SIZE } },
    onPaginationChange: setPagination,
    autoResetPageIndex: false, // tetap di halaman yang sama setelah perbarui/hapus
  });

  return (
    <>
      <div className="table-scroll">
        <table className="table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="muted">
                  Belum ada akun.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="muted m-0">
            Menampilkan {pageIndex * PAGE_SIZE + 1}-
            {Math.min((pageIndex + 1) * PAGE_SIZE, rows.length)} dari{" "}
            {rows.length} akun
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className={`${pageButton} bg-muted! text-foreground!`}
              disabled={pageIndex === 0}
              onClick={() => table.previousPage()}
            >
              Sebelumnya
            </button>
            {Array.from({ length: table.getPageCount() }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-current={i === pageIndex ? "page" : undefined}
                className={
                  i === pageIndex
                    ? pageButton
                    : `${pageButton} bg-muted! text-foreground!`
                }
                onClick={() => table.setPageIndex(i)}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              className={`${pageButton} bg-muted! text-foreground!`}
              disabled={pageIndex >= lastPage}
              onClick={() => table.nextPage()}
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}

      <AccountFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        account={editing}
      />
    </>
  );
}
