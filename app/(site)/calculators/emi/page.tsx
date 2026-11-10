import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { BankingCalculators } from "@/components/public/banking-calculators";

export const metadata = {
  title: "Bank Interest & EMI Calculator",
  description:
    "Simple interest, compound interest, loan EMI, flat vs reducing balance and full amortization schedule — real-time calculators.",
};

export default function EmiPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-navy-950 py-12 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-white">Bank Interest & EMI Calculator</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Simple interest, compound interest, loan EMI, flat vs reducing balance aur complete
            amortization schedule — sab kuch real-time.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <BankingCalculators />

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>
            Yeh calculators standard mathematical formulas use karte hain. Bank processing fee,
            GST, insurance, prepayment charges aur actual sanction terms alag ho sakte hain.
            Loan lene se pehle bank ki sanctioned repayment schedule zaroor check karein.
          </span>
        </div>
      </section>
    </>
  );
}
