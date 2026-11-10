"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info" | "warning";
type Toast = { id: number; kind: ToastKind; title: string; message?: string };

const ToastContext = createContext<{
  push: (kind: ToastKind, title: string, message?: string) => void;
}>({ push: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: TriangleAlert,
  info: Info,
};

const styles: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-white text-emerald-800",
  error: "border-rose-200 bg-white text-rose-800",
  warning: "border-amber-200 bg-white text-amber-800",
  info: "border-sky-200 bg-white text-sky-800",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5200);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => {
          const Icon = icons[t.kind];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex animate-fade-up items-start gap-3 rounded-xl border p-3 shadow-pop",
                styles[t.kind],
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.message ? <p className="mt-0.5 text-xs text-slate-600">{t.message}</p> : null}
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
