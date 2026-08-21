import { ChevronLeft, ChevronRight } from "lucide-react";
import { TABLE_PAGE_SIZE_ALL, TABLE_PAGE_SIZE_OPTIONS } from "@/lib/tablePageSize";

export { TABLE_PAGE_SIZE_ALL, TABLE_PAGE_SIZE_OPTIONS };

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
};

const TablePagination = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className = "",
}: Props) => {
  if (total === 0) return null;
  const size = pageSize > 0 ? pageSize : Math.max(total, 1);
  const start = (page - 1) * size + 1;
  const end = Math.min(total, page * size);

  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => pages.push(n);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) push(i);
  } else {
    push(1);
    if (page > 3) push("…");
    const startP = Math.max(2, page - 1);
    const endP = Math.min(totalPages - 1, page + 1);
    for (let i = startP; i <= endP; i++) push(i);
    if (page < totalPages - 2) push("…");
    push(totalPages);
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none focus:border-primary"
              aria-label="Rows per page"
            >
              {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n === TABLE_PAGE_SIZE_ALL ? "All" : n}
                </option>
              ))}
            </select>
            <span>per page</span>
          </label>
        )}
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{start}</span>–
          <span className="font-semibold text-foreground">{end}</span> of{" "}
          <span className="font-semibold text-foreground">{total}</span>
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-2 text-xs text-muted-foreground">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[28px] rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                p === page
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
