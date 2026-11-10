import Link from "next/link";
import { AlertTriangle, Calculator, Filter, Search, Sun } from "lucide-react";
import { can, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { customerScope } from "@/lib/access";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Select,
} from "@/components/ui";
import { SchemeDialog } from "@/components/subsidy/scheme-dialog";
import { DeleteScheme } from "@/components/subsidy/delete-scheme";
import { InternalSubsidyCalculator } from "@/components/subsidy/internal-calculator";
import { formatDate, formatINR, toInputDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function SubsidySchemesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("subsidy.view");
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const stateFilter = one(sp.state);
  const active = one(sp.active);
  const capacity = Number(one(sp.capacity)) || 3;
  const customerId = one(sp.customer);

  const scope = await customerScope(user);
  const [schemes, customers, preselectedCustomer, settings] = await Promise.all([
    prisma.subsidyScheme.findMany({
      where: {
        ...(q ? { OR: [{ name: { contains: q } }, { schemeCode: { contains: q } }] } : {}),
        ...(stateFilter ? { state: stateFilter } : {}),
        ...(active === "active" ? { isActive: true } : active === "inactive" ? { isActive: false } : {}),
      },
      orderBy: [{ isActive: "desc" }, { state: "asc" }, { capacityMinKw: "asc" }],
      include: { _count: { select: { calculations: true } } },
    }),
    prisma.customer.findMany({
      where: { AND: [scope, { isArchived: false }] },
      orderBy: { fullName: "asc" },
      take: 500,
      select: { id: true, fullName: true, customerCode: true, capacityKw: true, systemCost: true },
    }),
    customerId
      ? prisma.customer.findUnique({
          where: { id: customerId },
          select: { id: true, fullName: true, customerCode: true, capacityKw: true, systemCost: true },
        })
      : Promise.resolve(null),
    prisma.setting.findUnique({ where: { key: "subsidy_disclaimer" } }),
  ]);

  const canManage = can(user, "subsidy.manage");
  const now = new Date();
  const states = Array.from(new Set(schemes.map((s) => s.state))).sort();
  const unverified = schemes.filter((s) => s.isActive && s.centralRatePerKw + s.stateRatePerKw === 0);

  return (
    <div>
      <PageHeader
        title="Subsidy schemes"
        subtitle="Government subsidy rules, slabs, rates, caps aur effective dates — admin-managed, no hardcoding."
        eyebrow="Business"
      >
        {canManage ? <SchemeDialog /> : null}
      </PageHeader>

      {unverified.length ? (
        <div className="mb-4">
          <Alert tone="warning" title="Zero-rate schemes active hain">
            {unverified.length} active scheme row(s) ki rate 0 hai. Yeh placeholder ho sakti hain — official notification verify karke
            rates update karein. Calculator 0 subsidy dikhayega jab tak rates set nahi hote.
          </Alert>
        </div>
      ) : null}

      <Card className="mb-4">
        <CardHeader
          title="Subsidy calculator"
          subtitle="Internal estimate — customer ke record me save kar sakte hain"
          action={<span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Calculator className="h-3.5 w-3.5" /> Live rates</span>}
        />
        <div className="p-5">
          {preselectedCustomer ? (
            <p className="mb-3 rounded-md bg-sky-50 px-3 py-2 text-[11px] text-sky-800">
              Customer: <strong>{preselectedCustomer.fullName}</strong> ({preselectedCustomer.customerCode}) · capacity{" "}
              {preselectedCustomer.capacityKw} kW · system cost {formatINR(preselectedCustomer.systemCost)}.
            </p>
          ) : null}
          <InternalSubsidyCalculator
            customers={customers}
            defaultCustomerId={preselectedCustomer?.id}
            defaultCapacity={capacity}
          />
        </div>
      </Card>

      <Card className="mb-4">
        <form action="/app/subsidy-schemes" className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Scheme name or code…" className="input pl-9" />
          </div>
          <Select name="state" defaultValue={stateFilter} aria-label="State">
            <option value="">All states</option>
            {states.map((s) => <option key={s} value={s}>{s === "ALL" ? "All states (central)" : s}</option>)}
          </Select>
          <Select name="active" defaultValue={active} aria-label="Active">
            <option value="">All schemes</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </Select>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-navy-900 px-4 text-xs font-semibold text-white hover:bg-navy-800">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            <Link href="/app/subsidy-schemes" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</Link>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Configured rules"
          subtitle={`${schemes.length} scheme row(s) · central + state slabs`}
          action={
            <span className="text-[11px] text-slate-500">
              {settings?.value ? "Disclaimer configured in Settings" : "Default disclaimer in use"}
            </span>
          }
        />
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Scheme</th>
                <th>State / DISCOM</th>
                <th>Slab</th>
                <th className="text-right">Central ₹/kW</th>
                <th className="text-right">State ₹/kW</th>
                <th className="text-right">Cap</th>
                <th>Effective</th>
                <th>Status</th>
                <th>Used</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schemes.map((s) => {
                const effective =
                  s.isActive &&
                  s.effectiveFrom <= now &&
                  (!s.effectiveTo || s.effectiveTo >= now);
                return (
                  <tr key={s.id}>
                    <td>
                      <p className="font-semibold text-navy-900">{s.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{s.schemeCode}</p>
                      {s.sourceUrl ? (
                        <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-solar-700 hover:underline">
                          Official source
                        </a>
                      ) : null}
                    </td>
                    <td className="text-xs">
                      {s.state === "ALL" ? "All states" : s.state}
                      <p className="text-[10px] text-slate-400">{s.discom || "Any DISCOM"}</p>
                    </td>
                    <td className="whitespace-nowrap text-xs">{s.capacityMinKw}–{s.capacityMaxKw} kW</td>
                    <td className="text-right text-xs">{formatINR(s.centralRatePerKw)}</td>
                    <td className="text-right text-xs">{formatINR(s.stateRatePerKw)}</td>
                    <td className="text-right text-xs">{s.maxSubsidy > 0 ? formatINR(s.maxSubsidy) : "—"}</td>
                    <td className="whitespace-nowrap text-[11px] text-slate-500">
                      {formatDate(s.effectiveFrom)}
                      <p className="text-[10px] text-slate-400">{s.effectiveTo ? `to ${formatDate(s.effectiveTo)}` : "no end date"}</p>
                    </td>
                    <td>
                      <Badge tone={effective ? "success" : s.isActive ? "warning" : "neutral"}>
                        {effective ? "Active" : s.isActive ? "Not effective" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="text-center text-xs text-slate-500">{s._count.calculations}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {canManage ? (
                          <>
                            <SchemeDialog
                              scheme={{
                                id: s.id,
                                name: s.name,
                                schemeCode: s.schemeCode,
                                state: s.state,
                                discom: s.discom,
                                capacityMinKw: s.capacityMinKw,
                                capacityMaxKw: s.capacityMaxKw,
                                centralRatePerKw: s.centralRatePerKw,
                                stateRatePerKw: s.stateRatePerKw,
                                maxSubsidy: s.maxSubsidy,
                                effectiveFrom: toInputDate(s.effectiveFrom),
                                effectiveTo: s.effectiveTo ? toInputDate(s.effectiveTo) : null,
                                eligibility: s.eligibility,
                                sourceUrl: s.sourceUrl,
                                notes: s.notes,
                                isActive: s.isActive,
                              }}
                            />
                            <DeleteScheme id={s.id} used={s._count.calculations > 0} />
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">View only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!schemes.length ? (
          <EmptyState
            icon={<Sun className="h-5 w-5" />}
            title="No subsidy schemes configured"
            description="Create the first scheme row with rates, slab and effective dates. Calculator will use it immediately."
            action={canManage ? <SchemeDialog /> : undefined}
          />
        ) : null}
      </Card>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[11px] leading-relaxed text-slate-500">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        <span>
          Important: subsidy rules government notifications se badalte rehte hain. Har row par official source URL aur
          verification notes rakhein. Calculator sirf active, currently-effective rows use karta hai.
        </span>
      </div>
    </div>
  );
}
