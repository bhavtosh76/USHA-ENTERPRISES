import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  total,
  makeHref,
}: {
  page: number;
  pageCount: number;
  total: number;
  makeHref: (page: number) => string;
}) {
  if (pageCount <= 1) {
    return <p className="px-4 py-3 text-[11px] text-slate-400">{total} record{total === 1 ? "" : "s"}</p>;
  }
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
      <p className="text-[11px] text-slate-500">
        Page {page} of {pageCount} · {total} records
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={makeHref(Math.max(1, page - 1))}
          aria-disabled={page === 1}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50",
            page === 1 && "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
        {pages.map((p, i) => (
          <span key={p} className="flex items-center gap-1">
            {i > 0 && p - pages[i - 1] > 1 ? <span className="px-0.5 text-slate-300">…</span> : null}
            <Link
              href={makeHref(p)}
              className={cn(
                "grid h-7 min-w-7 place-items-center rounded-md border px-1.5 text-[11px] font-medium",
                p === page
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              {p}
            </Link>
          </span>
        ))}
        <Link
          href={makeHref(Math.min(pageCount, page + 1))}
          aria-disabled={page === pageCount}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50",
            page === pageCount && "pointer-events-none opacity-40",
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
