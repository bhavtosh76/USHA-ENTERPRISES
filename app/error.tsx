"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
          <AlertTriangle className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-xl font-bold text-navy-950">Kuch galat ho gaya</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
          Is page ko load karte waqt unexpected error aaya. Aap dobara try kar sakte hain. Agar
          problem bani rahe to administrator ko error code batayein.
        </p>
        {error.digest ? (
          <p className="mt-3 inline-block rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-600">
            Error code: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Home className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
