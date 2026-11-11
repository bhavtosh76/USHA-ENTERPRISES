"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save, Sun } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import { DISCOMS } from "@/lib/constants";
import { formatINR } from "@/lib/utils";

type Result = {
  capacityKw: number;
  centralSubsidy: number;
  stateSubsidy: number;
  totalSubsidy: number;
  systemCost: number;
  customerContribution: number;
  disclaimer: string;
  breakdown: {
    schemeId: string;
    name: string;
    capacityInSlab: number;
    centralRatePerKw: number;
    stateRatePerKw: number;
    centralAmount: number;
    stateAmount: number;
    capped: boolean;
    notes?: string | null;
    sourceUrl?: string | null;
  }[];
};

export function InternalSubsidyCalculator({
  customers,
  defaultCustomerId,
  defaultCapacity,
}: {
  customers: { id: string; fullName: string; customerCode: string; capacityKw: number; systemCost: number }[];
  defaultCustomerId?: string;
  defaultCapacity?: number;
}) {
  const toast = useToast();
  const preselected = customers.find((c) => c.id === defaultCustomerId);
  const [customerId, setCustomerId] = useState(defaultCustomerId || "");
  const [capacity, setCapacity] = useState(String(defaultCapacity || preselected?.capacityKw || 3));
  const [costPerKw, setCostPerKw] = useState(
    String(preselected && preselected.systemCost > 0 && preselected.capacityKw > 0 ? Math.round(preselected.systemCost / preselected.capacityKw) : 70000),
  );
  const [stateName, setStateName] = useState("Uttar Pradesh");
  const [discom, setDiscom] = useState("MVVNL");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subsidy/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacityKw: Number(capacity) || 0.5,
          state: stateName,
          discom: discom || undefined,
          systemCostPerKw: Number(costPerKw) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Calculation failed.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [capacity, stateName, discom, costPerKw]);

  useEffect(() => {
    const timer = setTimeout(calculate, 300);
    return () => clearTimeout(timer);
  }, [calculate]);

  function pickCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    if (c.capacityKw > 0) setCapacity(String(c.capacityKw));
    if (c.systemCost > 0 && c.capacityKw > 0) setCostPerKw(String(Math.round(c.systemCost / c.capacityKw)));
  }

  async function save() {
    if (!customerId) {
      toast.push("info", "Select a customer", "Estimate save karne ke liye customer chunein.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/subsidy/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacityKw: Number(capacity) || 0.5,
          state: stateName,
          discom: discom || undefined,
          systemCostPerKw: Number(costPerKw) || 0,
          customerId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save estimate.");
      toast.push("success", "Estimate saved", `${formatINR(data.totalSubsidy)} subsidy saved to the customer record.`);
    } catch (e) {
      toast.push("error", "Save failed", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-3">
        <Field label="Customer" hint="Estimate save karne ke liye customer select karein">
          <Select value={customerId} onChange={(e) => pickCustomer(e.target.value)}>
            <option value="">No customer (preview only)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName} · {c.customerCode} · {c.capacityKw} kW</option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Capacity (kW)" required>
            <Input type="number" min={0.5} step="0.5" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </Field>
          <Field label="System cost (₹ / kW)">
            <Input type="number" min={0} step={1000} value={costPerKw} onChange={(e) => setCostPerKw(e.target.value)} />
          </Field>
          <Field label="State">
            <Select value={stateName} onChange={(e) => setStateName(e.target.value)}>
              <option>Uttar Pradesh</option>
              <option>Uttarakhand</option>
              <option>Delhi</option>
              <option>Haryana</option>
              <option>Rajasthan</option>
              <option>Madhya Pradesh</option>
            </Select>
          </Field>
          <Field label="DISCOM">
            <Select value={discom} onChange={(e) => setDiscom(e.target.value)}>
              <option value="">Other / Not sure</option>
              {DISCOMS.filter((d) => d !== "Other").map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
        </div>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          Rates admin-managed scheme rows se aate hain. Preview calculation save nahi hoti; “Save estimate” customer ke record me
          timestamped calculation add karta hai.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl bg-navy-950 p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Estimated subsidy</p>
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-solar-400" /> : <Sun className="h-4 w-4 text-solar-400" />}
          </div>
          <p className="mt-1 text-3xl font-bold text-solar-400">{formatINR(result?.totalSubsidy ?? 0)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-md bg-white/5 p-2.5 ring-1 ring-inset ring-white/10">
              <p className="text-slate-400">Central</p>
              <p className="mt-0.5 font-bold">{formatINR(result?.centralSubsidy ?? 0)}</p>
            </div>
            <div className="rounded-md bg-white/5 p-2.5 ring-1 ring-inset ring-white/10">
              <p className="text-slate-400">State</p>
              <p className="mt-0.5 font-bold">{formatINR(result?.stateSubsidy ?? 0)}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-[11px] text-slate-300">
            <div className="flex justify-between"><span>System cost</span><span className="font-semibold text-white">{formatINR(result?.systemCost ?? 0)}</span></div>
            <div className="flex justify-between"><span>Customer contribution</span><span className="font-semibold text-white">{formatINR(result?.customerContribution ?? 0)}</span></div>
          </div>
        </div>

        {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</p> : null}

        {result?.breakdown.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Applied slabs
            </p>
            <ul className="divide-y divide-slate-50">
              {result.breakdown.map((b) => (
                <li key={`${b.schemeId}-${b.capacityInSlab}`} className="flex items-start justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-slate-700">{b.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {b.capacityInSlab} kW · ₹{b.centralRatePerKw}/kW central · ₹{b.stateRatePerKw}/kW state
                      {b.capped ? " · capped" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-800">{formatINR(b.centralAmount + b.stateAmount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={save} disabled={saving || !customerId || !result}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save estimate to customer
          </Button>
          {result?.breakdown.length ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> {result.breakdown.length} scheme rule(s) applied
            </span>
          ) : null}
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400">{result?.disclaimer}</p>
      </div>
    </div>
  );
}
