import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  ArrowUpRight,
  Download,
  FileWarning,
  Filter,
  MapPin,
  Phone,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { requirePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { customerScope, staffScope } from "@/lib/access";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Select,
} from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { CUSTOMER_STATUSES, STATUS_LABELS, STATUS_TONES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STAGES: Record<string, string[]> = {
  docs: ["DOCUMENTS_PENDING", "DOCUMENTS_RECEIVED"],
  approved: ["APPROVED", "INSTALLATION_PENDING", "INSTALLATION_COMPLETED", "SUBSIDY_PENDING", "SUBSIDY_RECEIVED"],
  subsidy: ["SUBSIDY_PENDING", "SUBSIDY_RECEIVED"],
  install: ["INSTALLATION_PENDING", "INSTALLATION_COMPLETED"],
  rejected: ["REJECTED"],
};

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("customer.view");
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const status = one(sp.status);
  const stage = one(sp.stage);
  const staffId = one(sp.staff);
  const village = one(sp.village).trim();
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const pageSize = 20;

  const scope = await customerScope(user);

  const filters: Prisma.CustomerWhereInput[] = [{ isArchived: false }];
  if (q) {
    filters.push({
      OR: [
        { fullName: { contains: q } },
        { mobile: { contains: q } },
        { customerCode: { contains: q } },
        { village: { contains: q } },
        { consumerNumber: { contains: q } },
      ],
    });
  }
  if (status && CUSTOMER_STATUSES.includes(status as never)) filters.push({ status });
  if (stage && STAGES[stage]) filters.push({ status: { in: STAGES[stage] } });
  if (staffId) filters.push({ assignedStaffId: staffId });
  if (village) filters.push({ village: { contains: village } });

  const where: Prisma.CustomerWhereInput = { AND: [scope, ...filters] };

  const [total, customers, staffList, stageCounts] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedStaff: { select: { fullName: true } },
        _count: { select: { documents: true } },
      },
    }),
    can(user, "staff.view")
      ? prisma.staff.findMany({ where: { AND: [await staffScope(user), { status: "ACTIVE" }] }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } })
      : Promise.resolve([]),
    prisma.customer.groupBy({ by: ["status"], where: { AND: [scope, { isArchived: false }] }, _count: { _all: true } }),
  ]);

  const pendingDocs = customers.length
    ? await prisma.customerDocument.groupBy({
        by: ["customerId"],
        where: { customerId: { in: customers.map((c) => c.id) }, status: "PENDING" },
        _count: { _all: true },
      })
    : [];
  const pendingMap = new Map(pendingDocs.map((d) => [d.customerId, d._count._all]));

  const countByStatus = Object.fromEntries(stageCounts.map((s) => [s.status, s._count._all]));
  const stageTotal = (keys: string[]) => keys.reduce((sum, k) => sum + (countByStatus[k] || 0), 0);

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (stage) params.set("stage", stage);
    if (staffId) params.set("staff", staffId);
    if (village) params.set("village", village);
    params.set("page", String(p));
    return `/app/customers?${params.toString()}`;
  };

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (status) exportParams.set("status", status);
  if (stage) exportParams.set("stage", stage);
  if (staffId) exportParams.set("staff", staffId);
  if (village) exportParams.set("village", village);

  const tabs = [
    { key: "", label: "All", count: stageCounts.reduce((s, x) => s + x._count._all, 0) },
    { key: "docs", label: "Documents", count: stageTotal(STAGES.docs) },
    { key: "approved", label: "Approved+", count: stageTotal(STAGES.approved) },
    { key: "install", label: "Installation", count: stageTotal(STAGES.install) },
    { key: "subsidy", label: "Subsidy", count: stageTotal(STAGES.subsidy) },
    { key: "rejected", label: "Rejected", count: stageTotal(STAGES.rejected) },
  ];

  return (
    <div>
      <PageHeader
        title="Customers (CRM)"
        subtitle="Gaon-village se aaye sabhi customer applications, documents aur status — ek hi jagah."
        eyebrow="Customer Management"
      >
        {can(user, "reports.view") ? (
          <LinkButton href={`/app/reports?type=customers&${exportParams.toString()}`} variant="outline" size="sm">
            <Download className="h-3.5 w-3.5" /> Export
          </LinkButton>
        ) : null}
        {can(user, "customer.create") ? (
          <LinkButton href="/app/customers/new" size="sm">
            <Plus className="h-3.5 w-3.5" /> New customer
          </LinkButton>
        ) : null}
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const active = stage === t.key;
          const href = t.key ? `/app/customers?stage=${t.key}` : "/app/customers";
          return (
            <Link
              key={t.key || "all"}
              href={href}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                active
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      <Card className="mb-4">
        <form className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" action="/app/customers">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, mobile, code, village, consumer no…"
              className="input pl-9"
            />
          </div>
          <Select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </Select>
          {staffList.length ? (
            <Select name="staff" defaultValue={staffId}>
              <option value="">All staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </Select>
          ) : (
            <input name="village" defaultValue={village} placeholder="Village" className="input" />
          )}
          {staffList.length ? (
            <input name="village" defaultValue={village} placeholder="Village" className="input" />
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-navy-900 px-4 text-xs font-semibold text-white hover:bg-navy-800">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            <Link href="/app/customers" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="table-base">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Village</th>
                <th className="text-right">Capacity</th>
                <th>Status</th>
                <th>Docs</th>
                <th>Assigned</th>
                <th>Applied</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const pending = pendingMap.get(c.id) || 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/app/customers/${c.id}`} className="font-semibold text-navy-900 hover:text-solar-700">
                        {c.fullName}
                      </Link>
                      <p className="text-[10px] text-slate-400">{c.customerCode}</p>
                    </td>
                    <td>
                      <p className="text-xs">{c.mobile}</p>
                      {c.altMobile ? <p className="text-[10px] text-slate-400">{c.altMobile}</p> : null}
                    </td>
                    <td>
                      <p className="text-xs">{c.village || "—"}</p>
                      <p className="text-[10px] text-slate-400">{c.tehsil || c.district}</p>
                    </td>
                    <td className="text-right text-xs font-medium">{c.capacityKw} kW</td>
                    <td><Badge tone={STATUS_TONES[c.status] || "neutral"}>{STATUS_LABELS[c.status] || c.status}</Badge></td>
                    <td>
                      {pending > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                          <FileWarning className="h-3.5 w-3.5" /> {pending}
                        </span>
                      ) : c._count.documents > 0 ? (
                        <span className="text-[11px] text-emerald-700">{c._count.documents} ✓</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">0</span>
                      )}
                    </td>
                    <td className="text-xs text-slate-500">{c.assignedStaff?.fullName || "Unassigned"}</td>
                    <td className="whitespace-nowrap text-[11px] text-slate-500">{formatDate(c.applicationDate)}</td>
                    <td>
                      <Link href={`/app/customers/${c.id}`} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-navy-900">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-slate-100 md:hidden">
          {customers.map((c) => (
            <Link key={c.id} href={`/app/customers/${c.id}`} className="block p-4 active:bg-slate-50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-navy-900">{c.fullName}</p>
                  <p className="text-[10px] text-slate-400">{c.customerCode}</p>
                </div>
                <Badge tone={STATUS_TONES[c.status] || "neutral"}>{STATUS_LABELS[c.status] || c.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {c.mobile}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.village || "—"}</span>
                <span>{c.capacityKw} kW</span>
                {(pendingMap.get(c.id) || 0) > 0 ? (
                  <span className="font-semibold text-amber-700">{pendingMap.get(c.id)} docs pending</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>

        {!customers.length ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="No customers found"
            description="Filters change karein ya pehla customer add karein."
            action={can(user, "customer.create") ? <LinkButton href="/app/customers/new" size="sm"><Plus className="h-3.5 w-3.5" /> New customer</LinkButton> : undefined}
          />
        ) : (
          <Pagination page={page} pageCount={Math.ceil(total / pageSize)} total={total} makeHref={makeHref} />
        )}
      </Card>
    </div>
  );
}
