"use client";

import { useMemo, useState } from "react";
import {
  createPaginatedRowModel,
  flexRender,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { TablePagination } from "@/components/pagination";

export type ReportRow = {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
};

const PAGE_SIZE = 5;

const features = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

export function TransactionsTable({ rows }: { rows: ReportRow[] }) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const lastPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
  const pageIndex = Math.min(pagination.pageIndex, lastPage);

  const columns = useMemo<ColumnDef<typeof features, ReportRow>[]>(
    () => [
      { accessorKey: "date", header: "Tanggal" },
      { accessorKey: "type", header: "Jenis" },
      { accessorKey: "category", header: "Kategori" },
      {
        accessorKey: "amount",
        header: "Nominal",
        cell: ({ row }) => `Rp ${row.original.amount.toLocaleString("id-ID")}`,
      },
    ],
    [],
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
                  Tidak ada transaksi pada periode ini.
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
