"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Select } from "@/components/ui";
import { useToast } from "@/components/toast";

const STATUSES = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"];

export function EnquiryStatus({ id, current }: { id: string; current: string }) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(current);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    setStatus(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status update failed.");
      toast.push("success", "Enquiry updated", next);
      router.refresh();
    } catch (err) {
      toast.push("error", "Update failed", err instanceof Error ? err.message : undefined);
      setStatus(current);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {busy ? <Loader2 className="h-3 w-3 animate-spin text-slate-400" /> : null}
      <Select value={status} onChange={(e) => change(e.target.value)} className="h-8 w-[130px] text-[11px]" disabled={busy}>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>
    </span>
  );
}
