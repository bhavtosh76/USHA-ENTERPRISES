import Link from "next/link";
import { ArrowLeft, ExternalLink, Info, ShieldCheck } from "lucide-react";
import { SubsidyCalculator } from "@/components/public/subsidy-calculator";
import { prisma } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/utils";

export const metadata = {
  title: "Solar Subsidy Calculator",
  description:
    "Estimate PM Surya Ghar central and state solar subsidy for 1–10 kW residential rooftop systems. Rules are admin-configurable.",
};

export const dynamic = "force-dynamic";

export default async function SubsidyPage() {
  const [schemes, settings] = await Promise.all([
    prisma.subsidyScheme.findMany({
      where: { isActive: true },
      orderBy: [{ state: "asc" }, { capacityMinKw: "asc" }],
    }),
    prisma.setting.findMany({
      where: { key: { in: ["subsidy_disclaimer", "default_system_cost_per_kw"] } },
    }),
  ]);
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <>
      <section className="border-b border-slate-200 bg-navy-950 py-12 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-white">Government Solar Subsidy Calculator</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Solar capacity chunein aur estimated central + state subsidy dekhein. Saare rates
            admin-managed settings se aate hain — koi rule hardcoded nahi hai.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <SubsidyCalculator />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-navy-900">Active scheme rules (admin configured)</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Yeh rows Admin → Subsidy Schemes se update hoti hain. Effective dates aur source
                links ke saath.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Scheme</th>
                    <th>State</th>
                    <th className="text-right">Slab</th>
                    <th className="text-right">Central / kW</th>
                    <th className="text-right">State / kW</th>
                    <th className="text-right">Max</th>
                    <th>Effective</th>
                  </tr>
                </thead>
                <tbody>
                  {schemes.map((s) => (
                    <tr key={s.id}>
                      <td className="max-w-[240px]">
                        <p className="text-xs font-semibold text-slate-800">{s.name}</p>
                        <p className="text-[10px] text-slate-400">{s.schemeCode}</p>
                      </td>
                      <td className="text-xs">{s.state}</td>
                      <td className="text-right text-xs">{s.capacityMinKw}–{s.capacityMaxKw} kW</td>
                      <td className="text-right text-xs">{formatINR(s.centralRatePerKw)}</td>
                      <td className="text-right text-xs">{formatINR(s.stateRatePerKw)}</td>
                      <td className="text-right text-xs">{s.maxSubsidy ? formatINR(s.maxSubsidy) : "—"}</td>
                      <td className="whitespace-nowrap text-[11px] text-slate-500">{formatDate(s.effectiveFrom)}</td>
                    </tr>
                  ))}
                  {!schemes.length ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                        No active scheme configured. Please contact the administrator.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {schemes.some((s) => s.sourceUrl) ? (
              <div className="border-t border-slate-100 px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Official sources</p>
                <div className="mt-1.5 flex flex-wrap gap-3">
                  {[...new Map(schemes.filter((s) => s.sourceUrl).map((s) => [s.sourceUrl!, s])).values()].map((s) => (
                    <a key={s.id} href={s.sourceUrl!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-solar-700 hover:underline">
                      {new URL(s.sourceUrl!).hostname} <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="card-pad">
              <p className="flex items-center gap-2 text-xs font-bold text-navy-900">
                <Info className="h-4 w-4 text-amber-500" /> Important
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                {map.subsidy_disclaimer ||
                  "Yeh estimate hai. Actual subsidy customer ki eligibility, DISCOM feasibility approval aur Government sanction par depend karti hai."}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                Default system cost: {formatINR(Number(map.default_system_cost_per_kw || 55000))}/kW.
                Yeh sirf calculation ke liye assumption hai, quotation nahi.
              </p>
            </div>
            <div className="card-pad">
              <p className="flex items-center gap-2 text-xs font-bold text-navy-900">
                <ShieldCheck className="h-4 w-4 text-solar-600" /> Data & privacy
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                Calculator public hai — koi personal document ya Aadhaar number nahi maanga jaata.
                Customer documents sirf authorised login ke through, permission check ke saath dekhe jaate hain.
              </p>
              <Link href="/#contact" className="mt-3 inline-flex text-[11px] font-semibold text-solar-700 hover:underline">
                Apply with USHA ENTERPRISES →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
