"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import { CUSTOMER_STATUSES, STATUS_LABELS } from "@/lib/constants";

export function StatusUpdater({
  customerId,
  current,
}: {
  customerId: string;
  current: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(current);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (status === current) {
      toast.push("info", "Status unchanged", "Select a different status to update.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update status.");
      toast.push("success", "Status updated", STATUS_LABELS[status] || status);
      setNote("");
      router.refresh();
    } catch (err) {
      toast.push("error", "Update failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-bold text-navy-900">Update application status</p>
      <p className="mt-0.5 text-[11px] text-slate-500">Har change date, time aur staff name ke saath record hota hai.</p>
      <div className="mt-3 space-y-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="text-xs">
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="input text-xs"
        />
        <Button onClick={save} disabled={saving || status === current} size="sm" className="w-full">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save status
        </Button>
      </div>
    </div>
  );
}
