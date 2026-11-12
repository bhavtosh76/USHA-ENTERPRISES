import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BadgeCheck, Clock3, Filter, Search, Wrench } from "lucide-react";
import { can, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { customerScope, staffScope } from "@/lib/access";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Select,
  StatCard,
} from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { InstallationDialog } from "@/components/installations/installation-dialog";
import { formatDate, toInputDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function InstallationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("installation.view");
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const completion = one(sp.completion);
  const netMeter = one(sp.netMeter);
  const inspection = one(sp.inspection);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const pageSize = 20;
  const preselect = one(sp.customer);

  const scope = await customerScope(user);
  const filters: Prisma.InstallationWhereInput[] = [{ customer: { AND: [scope, { isArchived: false }] } }];
  if (completion) filters.push({ completionStatus: completion });
  if (netMeter) filters.push({ netMeterStatus: netMeter });
  if (inspection) filters.push({ inspectionStatus: inspection });
  if (q) {
    filters.push({
      OR: [
        { customer: { fullName: { contains: q } } },
        { customer: { customerCode: { contains: q } } },
        { customer: { village: { contains: q } } },
        { inverterSerial: { contains: q } },
        { panelSerials: { contains: q } },
      ],
    });
  }
  const where: Prisma.InstallationWhereInput = { AND: filters };

  const [total, rows, counts, pendingCustomers, customers, staff, preselectedCustomer] = await Promise.all([
    prisma.installation.count({ where }),
    prisma.installation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, fullName: true, customerCode: true, village: true, status: true, systemCost: true } },
        teamLead: { select: { fullName: true } },
      },
    }),
    prisma.installation.groupBy({
      by: ["completionStatus"],
      where: { customer: { AND: [scope, { isArchived: false }] } },
      _count: { _all: true },
    }),
    prisma.customer.findMany({
      where: {
        AND: [
          scope,
          { isArchived: false },
          { status: { in: ["APPROVED", "INSTALLATION_PENDING"] } },
          { installation: { is: null } },
        ],
      },
      orderBy: { applicationDate: "asc" },
      take: 8,
      select: { id: true, fullName: true, customerCode: true, village: true, capacityKw: true },
    }),
    can(user, "installation.manage")
      ? prisma.customer.findMany({
          where: { AND: [scope, { isArchived: false }] },
          orderBy: { fullName: "asc" },
          take: 500,
          select: { id: true, fullName: true, customerCode: true, capacityKw: true },
        })
      : Promise.resolve([]),
    prisma.staff.findMany({ where: { AND: [await staffScope(user), { status: "ACTIVE" }] }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
    preselect
      ? prisma.customer.findUnique({
          where: { id: preselect },
          select: { id: true, fullName: true, customerCode: true, capacityKw: true, installation: { select: { id: true } } },
        })
      : Promise.resolve(null),
  ]);

  const count = (s: string) => counts.find((c) => c.completionStatus === s)?._count._all ?? 0;
  const canManage = can(user, "installation.manage");

  const makeHref = (p: number) => {
    const params = new URLSearchParams({ page: String(p) });
    if (q) params.set("q", q);
    if (completion) params.set("completion", completion);
    if (netMeter) params.set("netMeter", netMeter);
    if (inspection) params.set("inspection", inspection);
    return `/app/installations?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Installations"
        subtitle="Site progress, panel/inverter records, inspection aur net metering."
        eyebrow="Operations"
      >
        {canManage ? (
          <InstallationDialog customers={customers} staff={staff} label="New installation" />
        ) : null}
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total installations" value={total} icon={<Wrench className="h-5 w-5" />} tone="brand" />
        <StatCard label="Pending" value={count("PENDING")} icon={<Clock3 className="h-5 w-5" />} tone="warning" />
        <StatCard label="In progress" value={count("IN_PROGRESS")} icon={<Wrench className="h-5 w-5" />} tone="info" />
        <StatCard label="Completed" value={count("COMPLETED")} icon={<BadgeCheck className="h-5 w-5" />} tone="success" />
      </div>

      {pendingCustomers.length ? (
        <Card className="mb-4">
          <CardHeader
            title="Awaiting installation"
            subtitle="Approved customers without an installation record"
            action={<span className="text-[11px] text-slate-500">{pendingCustomers.length} shown</span>}
          />
          <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {pendingCustomers.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <Link href={`/app/customers/${c.id}`} className="text-xs font-bold text-navy-900 hover:text-solar-700">{c.fullName}</Link>
                <p className="text-[10px] text-slate-400">{c.customerCode} · {c.village || "—"}</p>
                <p className="mt-1 text-[11px] text-slate-500">{c.capacityKw} kW</p>
                {canManage ? (
                  <div className="mt-2">
                    <InstallationDialog
                      customers={[{ id: c.id, fullName: c.fullName, customerCode: c.customerCode, capacityKw: c.capacityKw }]}
                      staff={staff}
                      defaultCustomerId={c.id}
                      label="Start installation"
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mb-4">
        <form action="/app/installations" className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Customer, village, serial number…" className="input pl-9" />
          </div>
          <Select name="completion" defaultValue={completion} aria-label="Completion">
            <option value="">All completion</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </Select>
          <Select name="inspection" defaultValue={inspection} aria-label="Inspection">
            <option value="">All inspection</option>
            <option value="PENDING">Inspection pending</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
          </Select>
          <Select name="netMeter" defaultValue={netMeter} aria-label="Net meter">
            <option value="">All net meter</option>
            <option value="PENDING">Pending</option>
            <option value="APPLIED">Applied</option>
            <option value="INSTALLED">Installed</option>
            <option value="APPROVED">Approved</option>
          </Select>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-navy-900 px-4 text-xs font-semibold text-white hover:bg-navy-800">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            <Link href="/app/installations" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</Link>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Installation register" subtitle={`${total} record${total === 1 ? "" : "s"}`} />
        <div className="hidden overflow-x-auto md:block">
          <table className="table-base">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Capacity</th>
                <th>Installed on</th>
                <th>Team lead</th>
                <th>Inverter</th>
                <th>Inspection</th>
                <th>Net meter</th>
                <th>Completion</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/app/customers/${r.customer.id}`} className="font-semibold text-navy-900 hover:text-solar-700">{r.customer.fullName}</Link>
                    <p className="text-[10px] text-slate-400">{r.customer.customerCode} · {r.customer.village || "—"}</p>
                  </td>
                  <td className="text-xs">{r.capacityKw} kW</td>
                  <td className="whitespace-nowrap text-xs">{formatDate(r.installationDate)}</td>
                  <td className="text-xs">{r.teamLead?.fullName || "—"}</td>
                  <td className="max-w-[160px] text-xs">
                    <p className="truncate">{r.inverterBrand || "—"} {r.inverterModel || ""}</p>
                    <p className="text-[10px] text-slate-400">{r.inverterSerial || "No serial"}</p>
                  </td>
                  <td><Badge tone={r.inspectionStatus === "PASSED" ? "success" : r.inspectionStatus === "FAILED" ? "danger" : "warning"}>{r.inspectionStatus}</Badge></td>
                  <td><Badge tone={r.netMeterStatus === "APPROVED" ? "success" : r.netMeterStatus === "INSTALLED" ? "info" : "neutral"}>{r.netMeterStatus}</Badge></td>
                  <td><Badge tone={r.completionStatus === "COMPLETED" ? "success" : r.completionStatus === "IN_PROGRESS" ? "info" : "warning"}>{r.completionStatus}</Badge></td>
                  <td className="text-right">
                    {canManage ? (
                      <InstallationDialog
                        customers={customers}
                        staff={staff}
                        installation={{
                          id: r.id,
                          customerId: r.customerId,
                          customerName: r.customer.fullName,
                          capacityKw: r.capacityKw,
                          installationDate: r.installationDate ? toInputDate(r.installationDate) : null,
                          teamLeadId: r.teamLeadId,
                          teamMembers: r.teamMembers,
                          inverterBrand: r.inverterBrand,
                          inverterModel: r.inverterModel,
                          inverterSerial: r.inverterSerial,
                          panelBrand: r.panelBrand,
                          panelModel: r.panelModel,
                          panelCount: r.panelCount,
                          panelSerials: r.panelSerials,
                          inspectionStatus: r.inspectionStatus,
                          inspectionDate: r.inspectionDate ? toInputDate(r.inspectionDate) : null,
                          netMeterStatus: r.netMeterStatus,
                          netMeterDate: r.netMeterDate ? toInputDate(r.netMeterDate) : null,
                          completionStatus: r.completionStatus,
                          remarks: r.remarks,
                        }}
                      />
                    ) : (
                      <Link href={`/app/customers/${r.customer.id}`} className="text-[11px] font-semibold text-solar-700 hover:underline">View</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {rows.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/app/customers/${r.customer.id}`} className="text-sm font-bold text-navy-900">{r.customer.fullName}</Link>
                  <p className="text-[10px] text-slate-400">{r.customer.customerCode} · {r.capacityKw} kW</p>
                </div>
                <Badge tone={r.completionStatus === "COMPLETED" ? "success" : "warning"}>{r.completionStatus}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span>Inspection: {r.inspectionStatus}</span>
                <span>Net meter: {r.netMeterStatus}</span>
                <span>{formatDate(r.installationDate)}</span>
              </div>
              {canManage ? (
                <div className="mt-3">
                  <InstallationDialog
                    customers={customers}
                    staff={staff}
                    installation={{
                      id: r.id,
                      customerId: r.customerId,
                      customerName: r.customer.fullName,
                      capacityKw: r.capacityKw,
                      installationDate: r.installationDate ? toInputDate(r.installationDate) : null,
                      teamLeadId: r.teamLeadId,
                      teamMembers: r.teamMembers,
                      inverterBrand: r.inverterBrand,
                      inverterModel: r.inverterModel,
                      inverterSerial: r.inverterSerial,
                      panelBrand: r.panelBrand,
                      panelModel: r.panelModel,
                      panelCount: r.panelCount,
                      panelSerials: r.panelSerials,
                      inspectionStatus: r.inspectionStatus,
                      inspectionDate: r.inspectionDate ? toInputDate(r.inspectionDate) : null,
                      netMeterStatus: r.netMeterStatus,
                      netMeterDate: r.netMeterDate ? toInputDate(r.netMeterDate) : null,
                      completionStatus: r.completionStatus,
                      remarks: r.remarks,
                    }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {!rows.length ? (
          <EmptyState
            icon={<Wrench className="h-5 w-5" />}
            title="No installations found"
            description="Start an installation for an approved customer, or change filters."
          />
        ) : (
          <Pagination page={page} pageCount={Math.ceil(total / pageSize)} total={total} makeHref={makeHref} />
        )}
      </Card>

      {preselectedCustomer && canManage ? (
        <div className="mt-4 rounded-xl border border-solar-200 bg-solar-50/60 p-4">
          <p className="text-xs font-bold text-solar-900">
            {preselectedCustomer.fullName} ({preselectedCustomer.customerCode})
          </p>
          <p className="mt-1 text-[11px] text-solar-800">
            {preselectedCustomer.installation
              ? "Is customer ka installation record already exists. Use the row action to update it."
              : "Is customer ke liye naya installation record banayein."}
          </p>
          {!preselectedCustomer.installation ? (
            <div className="mt-2">
              <InstallationDialog
                customers={[{ id: preselectedCustomer.id, fullName: preselectedCustomer.fullName, customerCode: preselectedCustomer.customerCode, capacityKw: preselectedCustomer.capacityKw }]}
                staff={staff}
                defaultCustomerId={preselectedCustomer.id}
                label="Create installation"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
