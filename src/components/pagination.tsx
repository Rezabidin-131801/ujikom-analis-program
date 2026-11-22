"use client";

const pageButton =
  "px-3! py-1.5! text-sm! disabled:cursor-not-allowed disabled:opacity-40";
const inactive = "bg-muted! text-foreground!";

type Props = {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (index: number) => void;
};

export function TablePagination({
  pageIndex,
  pageCount,
  pageSize,
  total,
  onPageChange,
}: Props) {
  if (pageCount <= 1) return null;
  const from = pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="muted m-0">
        Menampilkan {from}-{to} dari {total} data
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          className={`${pageButton} ${inactive}`}
          disabled={pageIndex === 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          Sebelumnya
        </button>
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-current={i === pageIndex ? "page" : undefined}
            className={
              i === pageIndex ? pageButton : `${pageButton} ${inactive}`
            }
            onClick={() => onPageChange(i)}
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          className={`${pageButton} ${inactive}`}
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
