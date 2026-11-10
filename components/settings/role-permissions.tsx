"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { useToast } from "@/components/toast";

export function RolePermissions({
  role,
  permissions,
  catalogue,
}: {
  role: { id: string; key: string; name: string; description: string | null; isSystem: boolean };
  permissions: string[];
  catalogue: { key: string; label: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>(permissions);
  const [saving, setSaving] = useState(false);
  const locked = role.key === "SUPER_ADMIN";

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Permissions save nahi hui.");
      toast.push("success", "Permissions updated", `${role.name} role ke permissions save ho gaye.`);
      router.refresh();
    } catch (err) {
      toast.push("error", "Save failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-navy-900">{role.name}</p>
            {role.isSystem ? <Badge tone="brand">System</Badge> : null}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">{role.description || "Custom role"}</p>
        </div>
        <span className="text-[10px] font-semibold text-slate-400">{selected.length} / {catalogue.length} selected</span>
      </div>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {catalogue.map((p) => (
          <label key={p.key} className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px] ${locked ? "border-slate-100 bg-slate-50 text-slate-400" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
            <input
              type="checkbox"
              checked={locked || selected.includes(p.key)}
              disabled={locked}
              onChange={() => toggle(p.key)}
              className="mt-0.5 h-3.5 w-3.5 accent-solar-600"
            />
            <span>
              <span className="block font-medium">{p.label}</span>
              <span className="block font-mono text-[9px] text-slate-400">{p.key}</span>
            </span>
          </label>
        ))}
      </div>

      {locked ? (
        <p className="mt-3 text-[10px] text-slate-400">Super Admin ke paas har permission automatically hoti hai.</p>
      ) : (
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save permissions
          </Button>
        </div>
      )}
    </div>
  );
}
