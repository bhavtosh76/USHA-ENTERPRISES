"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, Loader2, Phone, Sun, Zap } from "lucide-react";
import { formatINR } from "@/lib/utils";

type Result = {
  capacityKw: number;
  centralSubsidy: number;
  stateSubsidy: number;
  totalSubsidy: number;
  systemCost: number;
  costPerKw: number;
  customerContribution: number;
  disclaimer: string;
  breakdown: {
    schemeId: string;
    name: string;
    capacityInSlab: number;
    centralAmount: number;
    stateAmount: number;
    capped: boolean;
  }[];
};

export function SubsidyCalculator({ compact = false }: { compact?: boolean }) {
  const [capacity, setCapacity] = useState(3);
  const [costPerKw, setCostPerKw] = useState(55000);
  const [stateName, setStateName] = useState("Uttar Pradesh");
  const [discom, setDiscom] = useState("MVVNL");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/public/subsidy/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            capacityKw: capacity,
            state: stateName,
            discom,
            systemCostPerKw: costPerKw,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Calculation failed.");
        if (active) setResult(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Calculation failed.");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [capacity, costPerKw, stateName, discom]);

  return (
    <div className={compact ? "space-y-4" : "grid gap-6 lg:grid-cols-[1fr_1.05fr]"}>
      <div className="card-pad">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 text-amber-600">
            <Zap className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-bold text-navy-900">Subsidy Calculator</p>
            <p className="text-[11px] text-slate-500">Capacity chunein — estimate turant milega</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Solar Capacity (kW)</label>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 8, 10].map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setCapacity(kw)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                    capacity === kw
                      ? "border-solar-600 bg-solar-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-solar-300 hover:bg-solar-50"
                  }`}
                >
                  {kw} kW
                </button>
              ))}
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="mt-3 w-full accent-solar-600"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>1 kW</span>
              <span className="font-semibold text-slate-600">{capacity} kW selected</span>
              <span>10 kW</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">State</label>
              <select className="select" value={stateName} onChange={(e) => setStateName(e.target.value)}>
                <option>Uttar Pradesh</option>
                <option>Uttarakhand</option>
                <option>Delhi</option>
                <option>Haryana</option>
                <option>Rajasthan</option>
                <option>Madhya Pradesh</option>
              </select>
            </div>
            <div>
              <label className="label">DISCOM</label>
              <select className="select" value={discom} onChange={(e) => setDiscom(e.target.value)}>
                <option value="MVVNL">MVVNL</option>
                <option value="PVVNL">PVVNL</option>
                <option value="DVVNL">DVVNL</option>
                <option value="PuVVNL">PuVVNL</option>
                <option value="">Other / Not sure</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">System cost (₹ per kW)</label>
            <input
              type="number"
              min={0}
              step={1000}
              value={costPerKw}
              onChange={(e) => setCostPerKw(Number(e.target.value))}
              className="input"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Default estimate. Actual quotation material, brand aur site conditions par depend karta hai.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl bg-navy-950 text-white shadow-pop">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Estimated Subsidy</p>
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-solar-400" /> : <Sun className="h-4 w-4 text-solar-400" />}
          </div>
          <div className="px-5 py-5">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Total eligible subsidy</p>
            <p className="mt-1 text-3xl font-bold text-solar-400">
              {loading && !result ? "…" : formatINR(result?.totalSubsidy ?? 0)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-white/5 p-3 ring-1 ring-inset ring-white/10">
                <p className="text-slate-400">Central Govt.</p>
                <p className="mt-0.5 text-sm font-bold">{formatINR(result?.centralSubsidy ?? 0)}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 ring-1 ring-inset ring-white/10">
                <p className="text-slate-400">State Govt. (UP)</p>
                <p className="mt-0.5 text-sm font-bold">{formatINR(result?.stateSubsidy ?? 0)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 border-t border-white/10 bg-white/5 px-5 py-4 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Total system cost ({capacity} kW)</span>
              <span className="font-semibold text-white">{formatINR(result?.systemCost ?? 0)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Your estimated contribution</span>
              <span className="font-semibold text-white">{formatINR(result?.customerContribution ?? 0)}</span>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
        ) : null}

        {result?.breakdown?.length ? (
          <div className="card overflow-hidden">
            <p className="border-b border-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Applied scheme rules
            </p>
            <ul className="divide-y divide-slate-50">
              {result.breakdown.map((b) => (
                <li key={b.schemeId} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-700">{b.name}</p>
                    <p className="text-[10px] text-slate-400">{b.capacityInSlab} kW in slab{b.capped ? " · capped" : ""}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-800">
                    {formatINR(b.centralAmount + b.stateAmount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{result?.disclaimer || "Yeh estimated amount hai. Actual subsidy eligibility aur Government sanction par depend karti hai."}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/#contact"
            className="inline-flex items-center gap-1.5 rounded-lg bg-solar-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-solar-700"
          >
            Apply with USHA ENTERPRISES <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <a
            href="tel:+910000000000"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Phone className="h-3.5 w-3.5" /> Call us
          </a>
        </div>
      </div>
    </div>
  );
}
