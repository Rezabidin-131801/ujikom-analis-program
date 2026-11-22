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
import { Trash } from "lucide-react";
import { TablePagination } from "@/components/pagination";
import { deleteBudget } from "@/app/actions";

export type BudgetRow = {
  id: string;
  period: string;
  category: string;
  amount: number;
};

const PAGE_SIZE = 5;

const iconButton =
  "inline-flex size-8 items-center justify-center rounded-md bg-transparent! p-0! text-foreground! hover:bg-muted! disabled:cursor-not-allowed disabled:opacity-40";

const features = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

export function BudgetsTable({ rows }: { rows: BudgetRow[] }) {
  const [pending, startTransition] = useTransition();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const lastPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
  const pageIndex = Math.min(pagination.pageIndex, lastPage);

  function handleDelete(row: BudgetRow) {
    const ok = window.confirm(
      `Hapus anggaran "${row.category}" periode ${row.period}?`,
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      try {
        await deleteBudget(fd);
      } catch {
        window.alert("Gagal menghapus anggaran.");
      }
    });
  }

  const columns = useMemo<ColumnDef<typeof features, BudgetRow>[]>(
    () => [
      { accessorKey: "period", header: "Periode" },
      { accessorKey: "category", header: "Kategori" },
      {
        accessorKey: "amount",
        header: "Nominal",
        cell: ({ row }) => `Rp ${row.original.amount.toLocaleString("id-ID")}`,
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => {
          const b = row.original;
          return (
            <button
              type="button"
              className={`${iconButton} text-destructive!`}
              title="Hapus"
              aria-label={`Hapus anggaran ${b.category} periode ${b.period}`}
              disabled={pending}
              onClick={() => handleDelete(b)}
            >
              <Trash className="size-4" />
            </button>
          );
        },
      },
    ],
    [pending],
  );

  const table = useTable({
    features,
    data: rows,
    columns,
    state: { pagination: { pageIndex, pageSize: PAGE_SIZE } },
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
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
                  Belum ada anggaran.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        pageIndex={pageIndex}
        pageCount={table.getPageCount()}
        pageSize={PAGE_SIZE}
        total={rows.length}
        onPageChange={(i) => table.setPageIndex(i)}
      />
    </>
  );
}
