"use client";

import { useMemo, useState } from "react";
import { Calculator, ChevronDown, ChevronUp, TrendingUp, Wallet } from "lucide-react";
import { formatINR } from "@/lib/utils";

type Tab = "simple" | "compound" | "emi" | "compare";

const TABS: { key: Tab; label: string; sub: string }[] = [
  { key: "simple", label: "Simple Interest", sub: "SI" },
  { key: "compound", label: "Compound Interest", sub: "CI" },
  { key: "emi", label: "Loan EMI", sub: "EMI" },
  { key: "compare", label: "Flat vs Reducing", sub: "Compare" },
];

function num(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function Input({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  step = 1,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  min?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input pr-14"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-[10px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function BankingCalculators() {
  const [tab, setTab] = useState<Tab>("emi");

  // Simple interest
  const [siP, setSiP] = useState("100000");
  const [siR, setSiR] = useState("9");
  const [siT, setSiT] = useState("3");
  const si = useMemo(() => {
    const p = num(siP);
    const interest = (p * num(siR) * num(siT)) / 100;
    return { interest, total: p + interest };
  }, [siP, siR, siT]);

  // Compound interest
  const [ciP, setCiP] = useState("100000");
  const [ciR, setCiR] = useState("9");
  const [ciT, setCiT] = useState("5");
  const [ciN, setCiN] = useState("4");
  const ci = useMemo(() => {
    const p = num(ciP);
    const r = num(ciR) / 100;
    const t = num(ciT);
    const n = Math.max(1, num(ciN));
    const amount = p * Math.pow(1 + r / n, n * t);
    return { interest: amount - p, amount };
  }, [ciP, ciR, ciT, ciN]);

  // EMI
  const [loan, setLoan] = useState("500000");
  const [rate, setRate] = useState("9.5");
  const [tenure, setTenure] = useState("60");
  const [showAll, setShowAll] = useState(false);

  const emi = useMemo(() => {
    const p = num(loan);
    const monthlyRate = num(rate) / 12 / 100;
    const n = Math.max(1, Math.round(num(tenure)));
    const monthly =
      monthlyRate === 0 ? p / n : (p * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    const totalPayment = monthly * n;
    const totalInterest = totalPayment - p;

    let balance = p;
    const schedule: {
      no: number;
      opening: number;
      principal: number;
      interest: number;
      closing: number;
    }[] = [];
    for (let i = 1; i <= n; i++) {
      const interestPart = balance * monthlyRate;
      const principalPart = monthly - interestPart;
      const closing = Math.max(0, balance - principalPart);
      schedule.push({
        no: i,
        opening: balance,
        principal: principalPart,
        interest: interestPart,
        closing,
      });
      balance = closing;
    }
    return { monthly, totalPayment, totalInterest, schedule };
  }, [loan, rate, tenure]);

  // Flat vs reducing
  const [cmpP, setCmpP] = useState("500000");
  const [cmpR, setCmpR] = useState("10");
  const [cmpM, setCmpM] = useState("60");
  const compare = useMemo(() => {
    const p = num(cmpP);
    const r = num(cmpR) / 100;
    const n = Math.max(1, Math.round(num(cmpM)));
    const years = n / 12;
    const flatInterest = p * r * years;
    const flatEmi = (p + flatInterest) / n;
    const monthlyRate = r / 12;
    const reducingEmi =
      monthlyRate === 0 ? p / n : (p * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    const reducingTotal = reducingEmi * n;
    return {
      flatInterest,
      flatEmi,
      flatTotal: p + flatInterest,
      reducingEmi,
      reducingTotal,
      reducingInterest: reducingTotal - p,
      saving: flatInterest - (reducingTotal - p),
    };
  }, [cmpP, cmpR, cmpM]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50/70 p-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-[13px] ${
              tab === t.key
                ? "bg-white text-navy-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
            }`}
          >
            {t.label}
            <span className="ml-1 hidden text-[10px] font-normal text-slate-400 sm:inline">({t.sub})</span>
          </button>
        ))}
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="space-y-4 border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
          {tab === "simple" ? (
            <>
              <Input label="Principal Amount" value={siP} onChange={setSiP} suffix="₹" step={1000} />
              <Input label="Annual Interest Rate" value={siR} onChange={setSiR} suffix="% p.a." step={0.1} />
              <Input label="Time Period" value={siT} onChange={setSiT} suffix="years" step={0.5} />
              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">
                Formula: SI = (P × R × T) ÷ 100
              </div>
            </>
          ) : null}

          {tab === "compound" ? (
            <>
              <Input label="Principal Amount" value={ciP} onChange={setCiP} suffix="₹" step={1000} />
              <Input label="Annual Interest Rate" value={ciR} onChange={setCiR} suffix="% p.a." step={0.1} />
              <Input label="Time Period" value={ciT} onChange={setCiT} suffix="years" step={0.5} />
              <div>
                <label className="label">Compounding Frequency</label>
                <select className="select" value={ciN} onChange={(e) => setCiN(e.target.value)}>
                  <option value="1">Yearly (1×)</option>
                  <option value="2">Half-yearly (2×)</option>
                  <option value="4">Quarterly (4×)</option>
                  <option value="12">Monthly (12×)</option>
                  <option value="365">Daily (365×)</option>
                </select>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">
                Formula: A = P × (1 + r/n)<sup>n×t</sup>
              </div>
            </>
          ) : null}

          {tab === "emi" ? (
            <>
              <Input label="Loan Amount" value={loan} onChange={setLoan} suffix="₹" step={10000} />
              <Input label="Annual Interest Rate" value={rate} onChange={setRate} suffix="% p.a." step={0.1} />
              <Input
                label="Loan Tenure"
                value={tenure}
                onChange={setTenure}
                suffix="months"
                step={1}
                hint="Example: 5 years = 60 months"
              />
              <div className="grid grid-cols-3 gap-1.5">
                {[12, 36, 60, 84, 120, 180].map((m) => (
                  <button
                    key={m}
                    onClick={() => setTenure(String(m))}
                    className={`rounded-md border px-2 py-1.5 text-[11px] font-medium ${
                      Number(tenure) === m
                        ? "border-solar-500 bg-solar-50 text-solar-700"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {m / 12} yr
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {tab === "compare" ? (
            <>
              <Input label="Loan Amount" value={cmpP} onChange={setCmpP} suffix="₹" step={10000} />
              <Input label="Annual Interest Rate" value={cmpR} onChange={setCmpR} suffix="% p.a." step={0.1} />
              <Input label="Tenure" value={cmpM} onChange={setCmpM} suffix="months" step={1} />
              <div className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                Flat rate mein interest poore principal par lagta hai. Reducing balance mein interest
                outstanding balance par lagta hai — isliye total cost kam hoti hai.
              </div>
            </>
          ) : null}
        </div>

        <div className="bg-slate-50/50 p-5">
          {tab === "simple" ? (
            <div className="space-y-3">
              <ResultCard label="Total Interest" value={si.interest} tone="amber" />
              <ResultCard label="Total Amount Payable" value={si.total} tone="navy" big />
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-navy-700"
                  style={{ width: `${si.total > 0 ? (num(siP) / si.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Principal {formatINR(num(siP))} · Interest {formatINR(si.interest)}
              </p>
            </div>
          ) : null}

          {tab === "compound" ? (
            <div className="space-y-3">
              <ResultCard label="Total Interest Earned" value={ci.interest} tone="green" />
              <ResultCard label="Maturity Amount" value={ci.amount} tone="navy" big />
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-solar-500"
                  style={{ width: `${ci.amount > 0 ? (num(ciP) / ci.amount) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Principal {formatINR(num(ciP))} · Interest {formatINR(ci.interest)}
              </p>
            </div>
          ) : null}

          {tab === "emi" ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-navy-950 p-5 text-white shadow-sm">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Monthly EMI</p>
                <p className="mt-1 text-3xl font-bold text-solar-400">{formatINR(emi.monthly, true)}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <p className="text-slate-400">Total Interest</p>
                    <p className="mt-0.5 text-sm font-semibold">{formatINR(emi.totalInterest)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Total Repayment</p>
                    <p className="mt-0.5 text-sm font-semibold">{formatINR(emi.totalPayment)}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Amortization Schedule
                  </p>
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-solar-700"
                  >
                    {showAll ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showAll ? "Show first 12" : `All ${emi.schedule.length} rows`}
                  </button>
                </div>
                <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white">
                  <table className="table-base text-[11px]">
                    <thead className="sticky top-0">
                      <tr>
                        <th>#</th>
                        <th className="text-right">Opening</th>
                        <th className="text-right">Principal</th>
                        <th className="text-right">Interest</th>
                        <th className="text-right">Closing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAll ? emi.schedule : emi.schedule.slice(0, 12)).map((row) => (
                        <tr key={row.no}>
                          <td className="py-1.5">{row.no}</td>
                          <td className="py-1.5 text-right">{formatINR(row.opening)}</td>
                          <td className="py-1.5 text-right text-solar-700">{formatINR(row.principal)}</td>
                          <td className="py-1.5 text-right text-amber-700">{formatINR(row.interest)}</td>
                          <td className="py-1.5 text-right font-medium">{formatINR(row.closing)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "compare" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Flat Rate</p>
                  <p className="mt-1 text-xl font-bold text-navy-900">{formatINR(compare.flatEmi)}</p>
                  <p className="text-[10px] text-slate-500">per month</p>
                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px]">
                    <div className="flex justify-between"><span className="text-slate-500">Interest</span><span>{formatINR(compare.flatInterest)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold">{formatINR(compare.flatTotal)}</span></div>
                  </div>
                </div>
                <div className="rounded-xl border border-solar-200 bg-solar-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-solar-600">Reducing Balance</p>
                  <p className="mt-1 text-xl font-bold text-solar-800">{formatINR(compare.reducingEmi)}</p>
                  <p className="text-[10px] text-solar-700">per month</p>
                  <div className="mt-3 space-y-1 border-t border-solar-100 pt-2 text-[11px]">
                    <div className="flex justify-between"><span className="text-slate-500">Interest</span><span>{formatINR(compare.reducingInterest)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold">{formatINR(compare.reducingTotal)}</span></div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
                Reducing balance se approx <strong>{formatINR(Math.max(0, compare.saving))}</strong> interest bachta hai.
              </div>
              <p className="text-[11px] text-slate-500">
                Banks generally reducing balance EMI use karte hain. Flat rate quotes ko compare karte waqt
                effective rate zaroor check karein.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: number;
  tone: "amber" | "green" | "navy";
  big?: boolean;
}) {
  const styles = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    navy: "border-navy-200 bg-navy-900 text-white",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[tone]}`}>
      <div className="flex items-center gap-2">
        {tone === "navy" ? <Wallet className="h-3.5 w-3.5 opacity-70" /> : <TrendingUp className="h-3.5 w-3.5 opacity-70" />}
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
      </div>
      <p className={`mt-1 font-bold ${big ? "text-2xl" : "text-xl"}`}>{formatINR(value, true)}</p>
    </div>
  );
}

export function CalculatorBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-1 text-[11px] font-semibold text-navy-700">
      <Calculator className="h-3 w-3" /> Real-time
    </span>
  );
}
