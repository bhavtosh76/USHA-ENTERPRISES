import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BadgeCheck, Banknote, Clock3, Download, Search, Wallet } from "lucide-react";
import { can, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffScope } from "@/lib/access";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Select,
  StatCard,
} from "@/components/ui";
import { GeneratePayrollDialog } from "@/components/payroll/generate-dialog";
import { SalaryActions } from "@/components/payroll/salary-actions";
import { Pagination } from "@/components/pagination";
import { formatDate, formatINR, monthLabel, monthOptions } from "@/lib/utils";
import { currentMonth } from "@/lib/utils";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

const STATUS_TONE: Record<string, "warning" | "info" | "success"> = {
  PENDING: "warning",
  APPROVED: "info",
  PAID: "success",
};

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("payroll.view");
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(one(sp.month)) ? one(sp.month) : currentMonth();
  const status = one(sp.status);
  const q = one(sp.q).trim();
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const pageSize = 25;

  const scope = await staffScope(user);
  const filters: Prisma.SalaryWhereInput[] = [{ month }, { staff: scope }];
  if (status) filters.push({ status });
  if (q) {
    filters.push({
      OR: [
        { staff: { fullName: { contains: q } } },
        { staff: { employeeId: { contains: q } } },
        { slipNo: { contains: q } },
      ],
    });
  }
  const where: Prisma.SalaryWhereInput = { AND: filters };

  const [total, salaries, summary, staffOptions, settings, existingMonths] = await Promise.all([
    prisma.salary.count({ where }),
    prisma.salary.findMany({
      where,
      orderBy: [{ status: "asc" }, { staff: { fullName: "asc" } }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        staff: { select: { fullName: true, employeeId: true, designation: true, monthlySalary: true } },
        payments: { select: { id: true, amount: true, mode: true, reference: true, paidAt: true } },
      },
    }),
    prisma.salary.groupBy({
      by: ["status"],
      where: { month, staff: scope },
      _count: { _all: true },
      _sum: { netSalary: true },
    }),
    prisma.staff.findMany({
      where: { AND: [scope, { status: "ACTIVE" }] },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeId: true },
    }),
    prisma.setting.findMany({ where: { key: { in: ["default_working_days", "overtime_rate"] } } }),
    prisma.salary.findMany({ where: { staff: scope }, distinct: ["month"], orderBy: { month: "desc" }, take: 12, select: { month: true } }),
  ]);

  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const workingDays = Number(settingMap.default_working_days || 26);
  const overtimeRate = Number(settingMap.overtime_rate || 0);

  const count = (s: string) => summary.find((x) => x.status === s)?._count._all ?? 0;
  const sum = (s: string) => summary.find((x) => x.status === s)?._sum.netSalary ?? 0;
  const totalNet = summary.reduce((acc, s) => acc + (s._sum.netSalary ?? 0), 0);

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    params.set("month", month);
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `/app/payroll?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Payroll & salary"
        subtitle="Attendance-driven salary generation, approval, payment aur PDF slips."
        eyebrow="Human Resources"
      >
        {can(user, "payroll.manage") ? (
          <GeneratePayrollDialog
            defaultMonth={month}
            defaultWorkingDays={workingDays}
            defaultOvertimeRate={overtimeRate}
            staff={staffOptions}
          />
        ) : null}
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Month payroll" value={formatINR(totalNet)} hint={monthLabel(month)} icon={<Banknote className="h-5 w-5" />} tone="brand" />
        <StatCard label="Pending" value={count("PENDING")} hint={formatINR(sum("PENDING"))} icon={<Clock3 className="h-5 w-5" />} tone="warning" />
        <StatCard label="Approved" value={count("APPROVED")} hint={formatINR(sum("APPROVED"))} icon={<BadgeCheck className="h-5 w-5" />} tone="info" />
        <StatCard label="Paid" value={count("PAID")} hint={formatINR(sum("PAID"))} icon={<Wallet className="h-5 w-5" />} tone="success" />
      </div>

      <Card className="mb-4">
        <form action="/app/payroll" className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
          <Select name="month" defaultValue={month}>
            {monthOptions(18).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            {existingMonths.filter((m) => !monthOptions(18).some((o) => o.value === m.month)).map((m) => (
              <option key={m.month} value={m.month}>{monthLabel(m.month)}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={status}>
            <option value="">All status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Staff name, employee ID, slip no…" className="input pl-9" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-navy-900 px-4 text-xs font-semibold text-white hover:bg-navy-800">
              <Search className="h-3.5 w-3.5" /> Filter
            </button>
            <Link href="/app/payroll" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</Link>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title={`${monthLabel(month)} salary register`}
          subtitle={`${total} slip${total === 1 ? "" : "s"} · working days ${workingDays}`}
          action={
            <span className="text-[11px] text-slate-500">
              Formula: fixed ÷ {workingDays} × payable days + overtime + incentive − deductions
            </span>
          }
        />
        <div className="hidden overflow-x-auto md:block">
          <table className="table-base">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Slip</th>
                <th className="text-center">Present</th>
                <th className="text-center">Absent</th>
                <th className="text-right">Gross</th>
                <th className="text-right">Deductions</th>
                <th className="text-right">Net</th>
                <th>Status</th>
                <th>Paid on</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/app/staff/${s.staffId}`} className="font-semibold text-navy-900 hover:text-solar-700">{s.staff.fullName}</Link>
                    <p className="text-[10px] text-slate-400">{s.staff.employeeId} · {s.staff.designation}</p>
                  </td>
                  <td className="font-mono text-[10px] text-slate-500">{s.slipNo}</td>
                  <td className="text-center text-xs">{s.presentDays}</td>
                  <td className="text-center text-xs">{s.absentDays}</td>
                  <td className="text-right text-xs">{formatINR(s.grossSalary)}</td>
                  <td className="text-right text-xs text-rose-600">{formatINR(s.advance + s.otherDeduction)}</td>
                  <td className="text-right text-sm font-bold text-navy-900">{formatINR(s.netSalary)}</td>
                  <td><Badge tone={STATUS_TONE[s.status] || "neutral"}>{s.status}</Badge></td>
                  <td className="whitespace-nowrap text-[11px] text-slate-500">{s.paidAt ? formatDate(s.paidAt) : "—"}</td>
                  <td>
                    <SalaryActions
                      salary={{
                        id: s.id,
                        status: s.status,
                        incentive: s.incentive,
                        commission: s.commission,
                        advance: s.advance,
                        otherDeduction: s.otherDeduction,
                        remarks: s.remarks,
                      }}
                      canApprove={can(user, "payroll.approve")}
                      canManage={can(user, "payroll.manage")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {salaries.map((s) => (
            <div key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/app/staff/${s.staffId}`} className="text-sm font-bold text-navy-900">{s.staff.fullName}</Link>
                  <p className="text-[10px] text-slate-400">{s.staff.employeeId} · {s.slipNo}</p>
                </div>
                <Badge tone={STATUS_TONE[s.status] || "neutral"}>{s.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                <span>Present {s.presentDays}</span>
                <span>Absent {s.absentDays}</span>
                <span>Gross {formatINR(s.grossSalary)}</span>
                <span className="font-bold text-navy-900">Net {formatINR(s.netSalary)}</span>
              </div>
              <div className="mt-3">
                <SalaryActions
                  salary={{
                    id: s.id,
                    status: s.status,
                    incentive: s.incentive,
                    commission: s.commission,
                    advance: s.advance,
                    otherDeduction: s.otherDeduction,
                    remarks: s.remarks,
                  }}
                  canApprove={can(user, "payroll.approve")}
                  canManage={can(user, "payroll.manage")}
                />
              </div>
            </div>
          ))}
        </div>

        {!salaries.length ? (
          <EmptyState
            icon={<Wallet className="h-5 w-5" />}
            title="No salary slips for this month"
            description="Generate payroll from attendance, or change the month filter."
            action={
              can(user, "payroll.manage") ? (
                <span className="text-[11px] text-slate-500">Use “Generate payroll” above.</span>
              ) : undefined
            }
          />
        ) : (
          <Pagination page={page} pageCount={Math.ceil(total / pageSize)} total={total} makeHref={makeHref} />
        )}
      </Card>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-slate-400">
        <Download className="h-3 w-3" /> Slip PDFs are generated on demand and include attendance breakdown and company details.
      </p>
    </div>
  );
}

