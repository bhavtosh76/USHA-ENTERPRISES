"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/toast";
import { toInputDate } from "@/lib/utils";

export type SchemeRecord = {
  id: string;
  name: string;
  schemeCode: string;
  state: string;
  discom: string | null;
  capacityMinKw: number;
  capacityMaxKw: number;
  centralRatePerKw: number;
  stateRatePerKw: number;
  maxSubsidy: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  eligibility: string | null;
  sourceUrl: string | null;
  notes: string | null;
  isActive: boolean;
};

const STATES = ["ALL", "Uttar Pradesh", "Uttarakhand", "Delhi", "Haryana", "Rajasthan", "Madhya Pradesh"];

export function SchemeDialog({ scheme }: { scheme?: SchemeRecord }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(scheme?.name || "");
  const [schemeCode, setSchemeCode] = useState(scheme?.schemeCode || "");
  const [stateName, setStateName] = useState(scheme?.state || "ALL");
  const [discom, setDiscom] = useState(scheme?.discom || "");
  const [capacityMinKw, setCapacityMinKw] = useState(String(scheme?.capacityMinKw ?? 0));
  const [capacityMaxKw, setCapacityMaxKw] = useState(String(scheme?.capacityMaxKw ?? 3));
  const [centralRatePerKw, setCentralRatePerKw] = useState(String(scheme?.centralRatePerKw ?? 0));
  const [stateRatePerKw, setStateRatePerKw] = useState(String(scheme?.stateRatePerKw ?? 0));
  const [maxSubsidy, setMaxSubsidy] = useState(String(scheme?.maxSubsidy ?? 0));
  const [effectiveFrom, setEffectiveFrom] = useState(toInputDate(scheme?.effectiveFrom) || toInputDate(new Date()));
  const [effectiveTo, setEffectiveTo] = useState(toInputDate(scheme?.effectiveTo));
  const [eligibility, setEligibility] = useState(scheme?.eligibility || "");
  const [sourceUrl, setSourceUrl] = useState(scheme?.sourceUrl || "");
  const [notes, setNotes] = useState(scheme?.notes || "");
  const [isActive, setIsActive] = useState(scheme?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(scheme ? `/api/subsidy-schemes/${scheme.id}` : "/api/subsidy-schemes", {
        method: scheme ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          schemeCode: schemeCode.toUpperCase().replace(/\s+/g, "_"),
          state: stateName,
          discom: discom || null,
          capacityMinKw: Number(capacityMinKw) || 0,
          capacityMaxKw: Number(capacityMaxKw) || 0,
          centralRatePerKw: Number(centralRatePerKw) || 0,
          stateRatePerKw: Number(stateRatePerKw) || 0,
          maxSubsidy: Number(maxSubsidy) || 0,
          effectiveFrom,
          effectiveTo: effectiveTo || null,
          eligibility: eligibility || null,
          sourceUrl: sourceUrl || null,
          notes: notes || null,
          isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scheme save nahi hui.");
      toast.push("success", scheme ? "Scheme updated" : "Scheme created", "Subsidy calculator turant nayi rates use karega.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.push("error", "Save failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant={scheme ? "outline" : "primary"} onClick={() => setOpen(true)}>
        {scheme ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {scheme ? "Edit" : "New scheme"}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form onSubmit={submit} className="relative my-6 w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-pop">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">{scheme ? "Edit subsidy scheme" : "New subsidy scheme"}</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Government rules hardcoded nahi hain — yahan se rates, slabs, caps aur effective dates manage karein.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Scheme name" required className="sm:col-span-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="PM Surya Ghar — 1st slab" />
              </Field>
              <Field label="Scheme code" required hint="CAPS, numbers, - or _">
                <Input value={schemeCode} onChange={(e) => setSchemeCode(e.target.value.toUpperCase())} required placeholder="PM_SG_1" />
              </Field>
              <Field label="State" required>
                <Select value={stateName} onChange={(e) => setStateName(e.target.value)}>
                  {STATES.map((s) => <option key={s} value={s}>{s === "ALL" ? "All states" : s}</option>)}
                </Select>
              </Field>
              <Field label="DISCOM" hint="Blank = any DISCOM">
                <Input value={discom} onChange={(e) => setDiscom(e.target.value)} placeholder="MVVNL" />
              </Field>
              <Field label="Active">
                <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-700">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-solar-600" />
                  Scheme calculator me use hogi
                </label>
              </Field>
              <Field label="Capacity from (kW)" required>
                <Input type="number" min={0} step="0.1" value={capacityMinKw} onChange={(e) => setCapacityMinKw(e.target.value)} required />
              </Field>
              <Field label="Capacity up to (kW)" required>
                <Input type="number" min={0.1} step="0.1" value={capacityMaxKw} onChange={(e) => setCapacityMaxKw(e.target.value)} required />
              </Field>
              <Field label="Max subsidy cap (₹)" hint="0 = no cap">
                <Input type="number" min={0} step={1000} value={maxSubsidy} onChange={(e) => setMaxSubsidy(e.target.value)} />
              </Field>
              <Field label="Central rate (₹ / kW)" required>
                <Input type="number" min={0} step={100} value={centralRatePerKw} onChange={(e) => setCentralRatePerKw(e.target.value)} required />
              </Field>
              <Field label="State rate (₹ / kW)" required>
                <Input type="number" min={0} step={100} value={stateRatePerKw} onChange={(e) => setStateRatePerKw(e.target.value)} required />
              </Field>
              <Field label="Effective from" required>
                <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
              </Field>
              <Field label="Effective to" hint="Blank = no end date">
                <Input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
              </Field>
              <Field label="Source URL" className="sm:col-span-2" hint="Official government notification link">
                <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Eligibility notes" className="sm:col-span-2 lg:col-span-3">
                <Textarea value={eligibility} onChange={(e) => setEligibility(e.target.value)} placeholder="Eligibility conditions, documents, category limits…" />
              </Field>
              <Field label="Internal notes" className="sm:col-span-2 lg:col-span-3" hint="Verification status, source checked date, etc.">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {scheme ? "Save changes" : "Create scheme"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
