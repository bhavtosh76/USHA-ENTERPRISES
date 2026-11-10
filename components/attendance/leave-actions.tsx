"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { useToast } from "@/components/toast";

export function LeaveActions({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  async function decide(status: "APPROVED" | "REJECTED") {
    setLoading(status);
    try {
      const res = await fetch(`/api/leaves/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed.");
      toast.push("success", `Leave ${status.toLowerCase()}`, status === "APPROVED" ? "Attendance register pre-filled." : undefined);
      router.refresh();
    } catch (err) {
      toast.push("error", "Action failed", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={() => decide("APPROVED")}
        disabled={Boolean(loading)}
        className="grid h-7 w-7 place-items-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        title="Approve"
      >
        {loading === "APPROVED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={() => decide("REJECTED")}
        disabled={Boolean(loading)}
        className="grid h-7 w-7 place-items-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        title="Reject"
      >
        {loading === "REJECTED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
