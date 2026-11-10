"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";

export function StaffDangerZone({ staffId, name }: { staffId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete or deactivate ${name}? Linked records (customers, salary, attendance) hone par account deactivate hoga, delete nahi.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${staffId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed.");
      toast.push("success", data.deactivated ? "Account deactivated" : "Staff deleted", data.message);
      router.push("/app/staff");
      router.refresh();
    } catch (err) {
      toast.push("error", "Action failed", err instanceof Error ? err.message : undefined);
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
      <p className="text-xs font-bold text-rose-800">Danger zone</p>
      <p className="mt-1 text-[10px] leading-relaxed text-rose-700">
        Agar customer, salary ya attendance records linked hain to account delete nahi hoga — sirf deactivate hoga,
        taaki business history safe rahe.
      </p>
      <Button variant="danger" size="sm" className="mt-2 w-full" onClick={remove} disabled={loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Delete / deactivate staff
      </Button>
    </div>
  );
}
