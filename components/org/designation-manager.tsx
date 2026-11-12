"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2, X } from "lucide-react";
import type { DesignationOption } from "@/lib/org-types";
import { Badge, Button } from "@/components/ui";

export function DesignationManager({ designations }: { designations: DesignationOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("50");
  const [department, setDepartment] = useState("Field Operations");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/designations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, level: Number(level) || 50, department, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create designation.");
      setName("");
      setDescription("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create designation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="h-3.5 w-3.5" /> Designations
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-navy-950/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-navy-900">Designations</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Higher level = more senior. Custom designations are available in the employee form immediately.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-slate-100">
              <table className="table-base">
                <thead><tr><th>Designation</th><th>Department</th><th className="text-right">Level</th></tr></thead>
                <tbody>
                  {designations.map((d) => (
                    <tr key={d.id}>
                      <td className="text-xs font-semibold text-slate-800">{d.name}{d.isSystem ? <Badge tone="neutral" className="ml-1 text-[9px]">system</Badge> : null}</td>
                      <td className="text-xs text-slate-500">{d.department?.name || "—"}</td>
                      <td className="text-right text-xs font-mono">{d.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form onSubmit={submit} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Add custom designation</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block sm:col-span-2">
                  <span className="label">Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Zonal Manager" required />
                </label>
                <label className="block">
                  <span className="label">Level</span>
                  <input type="number" min={0} max={100} value={level} onChange={(e) => setLevel(e.target.value)} className="input" />
                </label>
                <label className="block">
                  <span className="label">Department</span>
                  <input value={department} onChange={(e) => setDepartment(e.target.value)} className="input" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="label">Description</span>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="Optional" />
                </label>
              </div>
              {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</div> : null}
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={saving}>
                  <Plus className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Add designation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
