import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowUpRight, Filter, Plus, Search, Users } from "lucide-react";
import { requirePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffScope } from "@/lib/access";
import { Badge, Card, EmptyState, LinkButton, PageHeader, Select, StatCard } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("staff.view");
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const status = one(sp.status);
  const designation = one(sp.designation);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const pageSize = 20;

  const scope = await staffScope(user);
  const filters: Prisma.StaffWhereInput[] = [];
  if (q) {
    filters.push({
      OR: [
        { fullName: { contains: q } },
        { employeeId: { contains: q } },
        { mobile: { contains: q } },
        { designation: { contains: q } },
      ],
    });
  }
  if (status) filters.push({ status });
  if (designation) filters.push({ designation });

  const where: Prisma.StaffWhereInput = { AND: [scope, ...filters] };

  const [total, staff, summary, salaryAgg, designations] = await Promise.all([
    prisma.staff.count({ where }),
    prisma.staff.findMany({
      where,
      orderBy: [{ status: "asc" }, { fullName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { include: { role: { select: { name: true, key: true } } } },
        reportsTo: { select: { fullName: true } },
        _count: { select: { customers: true } },
      },
    }),
    prisma.staff.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    prisma.staff.aggregate({
      where: { AND: [scope, { status: "ACTIVE" }] },
      _sum: { monthlySalary: true },
    }),
    prisma.designation.findMany({
      where: { isActive: true },
      orderBy: [{ level: "desc" }, { name: "asc" }],
      select: { name: true },
    }),
  ]);

  const active = summary.find((s) => s.status === "ACTIVE")?._count._all ?? 0;
  const inactive = summary.find((s) => s.status !== "ACTIVE")?._count._all ?? 0;

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (designation) params.set("designation", designation);
    params.set("page", String(p));
    return `/app/staff?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader title="Staff management" subtitle="Employees, roles, salary structure aur performance." eyebrow="Human Resources">
        {can(user, "staff.manage") ? (
          <LinkButton href="/app/staff/new" size="sm"><Plus className="h-3.5 w-3.5" /> Add staff</LinkButton>
        ) : null}
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total staff" value={total} icon={<Users className="h-5 w-5" />} tone="brand" />
        <StatCard label="Active staff" value={active} tone="success" hint={`${inactive} inactive`} />
        <StatCard label="Monthly salary" value={formatINR(salaryAgg._sum.monthlySalary ?? 0)} hint="Active staff fixed" tone="info" />
        <StatCard label="Designations" value={designations.length} hint="Configured roles" tone="purple" />
      </div>

      <Card className="mb-4">
        <form action="/app/staff" className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Name, employee ID, mobile…" className="input pl-9" />
          </div>
          <Select name="status" defaultValue={status}>
            <option value="">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
          </Select>
          <Select name="designation" defaultValue={designation}>
            <option value="">All designations</option>
            {designations.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </Select>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-navy-900 px-4 text-xs font-semibold text-white hover:bg-navy-800">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            <Link href="/app/staff" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</Link>
          </div>
        </form>
      </Card>

      <Card>
        <div className="hidden overflow-x-auto md:block">
          <table className="table-base">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Designation</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Area</th>
                <th className="text-right">Salary</th>
                <th className="text-center">Customers</th>
                <th>Status</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/app/staff/${s.id}`} className="font-semibold text-navy-900 hover:text-solar-700">{s.fullName}</Link>
                    <p className="text-[10px] text-slate-400">{s.employeeId}</p>
                  </td>
                  <td className="text-xs">{s.designation}<p className="text-[10px] text-slate-400">{s.department || "—"}</p></td>
                  <td><Badge tone={s.user?.role.key === "SUPER_ADMIN" ? "danger" : s.user?.role.key === "ADMIN" ? "brand" : "info"}>{s.user?.role.name || "No login"}</Badge></td>
                  <td className="text-xs">{s.mobile}</td>
                  <td className="text-xs">{s.area || "—"}</td>
                  <td className="text-right text-xs font-medium">{formatINR(s.monthlySalary)}</td>
                  <td className="text-center text-xs">{s._count.customers}</td>
                  <td><Badge tone={s.status === "ACTIVE" ? "success" : s.status === "TERMINATED" ? "danger" : "neutral"}>{s.status}</Badge></td>
                  <td className="whitespace-nowrap text-[11px] text-slate-500">{formatDate(s.joiningDate)}</td>
                  <td>
                    <Link href={`/app/staff/${s.id}`} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-navy-900">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {staff.map((s) => (
            <Link key={s.id} href={`/app/staff/${s.id}`} className="block p-4 active:bg-slate-50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-navy-900">{s.fullName}</p>
                  <p className="text-[10px] text-slate-400">{s.employeeId} · {s.designation}</p>
                </div>
                <Badge tone={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
                <span>{s.mobile}</span>
                <span>{s.area || "—"}</span>
                <span>{formatINR(s.monthlySalary)}</span>
                <span>{s._count.customers} customers</span>
              </div>
            </Link>
          ))}
        </div>

        {!staff.length ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title="No staff found" description="Add your first employee or change filters." action={can(user, "staff.manage") ? <LinkButton href="/app/staff/new" size="sm">Add staff</LinkButton> : undefined} />
        ) : (
          <Pagination page={page} pageCount={Math.ceil(total / pageSize)} total={total} makeHref={makeHref} />
        )}
      </Card>
    </div>
  );
}
