import { useEffect, useMemo, useState } from "react";
import { TABLE_PAGE_SIZE_ALL } from "@/lib/tablePageSize";

export const usePagination = <T,>(items: T[], defaultPageSize = 25) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const size = pageSize === TABLE_PAGE_SIZE_ALL ? Math.max(items.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(items.length / size));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const setPageSize = (next: number) => {
    setPageSizeState(next);
    setPage(1);
  };

  const paged = useMemo(() => {
    if (pageSize === TABLE_PAGE_SIZE_ALL) return items;
    const start = (page - 1) * size;
    return items.slice(start, start + size);
  }, [items, page, pageSize, size]);

  return {
    page,
    setPage,
    totalPages,
    pageSize,
    setPageSize,
    paged,
    total: items.length,
    next: () => setPage((p) => Math.min(totalPages, p + 1)),
    prev: () => setPage((p) => Math.max(1, p - 1)),
  };
};
