"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";

export function ArchiveCustomerButton({ customerId, name }: { customerId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function archive() {
    if (!window.confirm(`Archive ${name}? Record finance/audit ke liye safe rahega, lekin active list se hat jayega.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not archive.");
      toast.push("success", "Customer archived", "Record retained for audit and finance history.");
      router.push("/app/customers");
      router.refresh();
    } catch (err) {
      toast.push("error", "Archive failed", err instanceof Error ? err.message : undefined);
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold text-rose-800"><Archive className="h-3.5 w-3.5" /> Archive customer</p>
      <p className="mt-1 text-[10px] leading-relaxed text-rose-700">
        Customer list se hide hoga. Documents aur history delete nahi hoti. Permanent deletion policy ke hisaab se
        database administrator se karni hogi.
      </p>
      <Button variant="danger" size="sm" className="mt-2 w-full" onClick={archive} disabled={loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />} Archive
      </Button>
    </div>
  );
}
