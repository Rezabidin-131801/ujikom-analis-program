"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TablePagination } from "@/components/pagination";
import { addCategory, deleteCategory, updateCategory } from "@/app/actions";

export type CategoryType = "EXPENSE" | "INCOME";
export type CategoryRow = { id: string; name: string; type: CategoryType };

const TYPE_LABEL: Record<CategoryType, string> = {
  EXPENSE: "Pengeluaran",
  INCOME: "Pemasukan",
};
const PAGE_SIZE = 10;
const iconButton =
  "inline-flex size-8 items-center justify-center rounded-md bg-transparent! p-0! text-foreground! hover:bg-muted! disabled:cursor-not-allowed disabled:opacity-40";

const features = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

function CategoryForm({
  category,
  onDone,
}: {
  category?: CategoryRow;
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
        await (category ? updateCategory(fd) : addCategory(fd));
        onDone();
      } catch {
        setError(
          "Gagal menyimpan kategori. Pastikan data valid; jenis tidak dapat diubah bila kategori sudah dipakai transaksi.",
        );
      }
    });
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {category && <input type="hidden" name="id" value={category.id} />}
      <label>
        Nama kategori
        <input
          name="name"
          required
          maxLength={60}
          defaultValue={category?.name}
        />
      </label>
      <label>
        Jenis
        <select name="type" defaultValue={category?.type ?? "EXPENSE"}>
          <option value="EXPENSE">{TYPE_LABEL.EXPENSE}</option>
          <option value="INCOME">{TYPE_LABEL.INCOME}</option>
        </select>
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

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryRow;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? "Perbarui kategori" : "Tambah kategori pribadi"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Ubah nama atau jenis kategori."
              : "Buat kategori sendiri untuk mengelompokkan transaksi."}
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          key={category?.id ?? "new"}
          category={category}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Tombol di header section yang membuka dialog tambah kategori. */
export function AddCategoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        + Tambah kategori
      </button>
      <CategoryFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function CategoriesTable({ rows }: { rows: CategoryRow[] }) {
  const [editing, setEditing] = useState<CategoryRow | undefined>();
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const lastPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
  const pageIndex = Math.min(pagination.pageIndex, lastPage);

  function handleEdit(row: CategoryRow) {
    setEditing(row);
    setEditOpen(true);
  }

  function handleDelete(row: CategoryRow) {
    const ok = window.confirm(
      `Hapus kategori "${row.name}"? Kategori yang sudah dipakai transaksi atau anggaran akan dinonaktifkan, bukan dihapus permanen.`,
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      try {
        await deleteCategory(fd);
      } catch {
        window.alert("Gagal menghapus kategori.");
      }
    });
  }

  const columns = useMemo<ColumnDef<typeof features, CategoryRow>[]>(
    () => [
      { accessorKey: "name", header: "Nama" },
      {
        accessorKey: "type",
        header: "Jenis",
        cell: ({ row }) => TYPE_LABEL[row.original.type],
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex gap-1">
              <button
                type="button"
                className={iconButton}
                title="Perbarui"
                aria-label={`Perbarui kategori ${c.name}`}
                disabled={pending}
                onClick={() => handleEdit(c)}
              >
                <SquarePen className="size-4" />
              </button>
              <button
                type="button"
                className={`${iconButton} text-destructive!`}
                title="Hapus"
                aria-label={`Hapus kategori ${c.name}`}
                disabled={pending}
                onClick={() => handleDelete(c)}
              >
                <Trash className="size-4" />
              </button>
            </div>
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
                  Belum ada kategori pribadi.
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

      <CategoryFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={editing}
      />
    </>
  );
}
