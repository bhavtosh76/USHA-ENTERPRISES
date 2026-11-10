"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";

export function DeleteScheme({ id, used }: { id: string; used: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/subsidy-schemes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      toast.push("success", data.deactivated ? "Scheme deactivated" : "Scheme deleted", data.deactivated ? "Saved calculations ne ise protect kiya, isliye inactive kar diya." : "Scheme removed.");
      router.refresh();
    } catch (err) {
      toast.push("error", "Delete failed", err instanceof Error ? err.message : undefined);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button onClick={remove} disabled={busy} className="rounded-md bg-rose-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-700 disabled:opacity-50">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : used ? "Deactivate" : "Delete"}
        </button>
        <button onClick={() => setConfirming(false)} className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500">No</button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
      title={used ? "Deactivate scheme (used by saved calculations)" : "Delete scheme"}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
