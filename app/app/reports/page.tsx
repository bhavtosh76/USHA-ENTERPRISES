import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  CalendarCheck,
  Contact,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
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
} from "@/components/ui";
import { ATTENDANCE_LABELS, CATEGORY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatINR, monthLabel, monthOptions, monthRange, toInputDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

const REPORTS = [
  { key: "customers", label: "Customers", icon: Contact, description: "Applications, capacity, system cost, status" },
  { key: "staff", label: "Staff", icon: Users, description: "Directory, roles, salary, status" },
  { key: "payroll", label: "Payroll", icon: Wallet, description: "Monthly salary register and payouts" },
  { key: "finance", label: "Finance", icon: Landmark, description: "Income, expenses, P&L by period" },
  { key: "attendance", label: "Attendance", icon: CalendarCheck, description: "Daily attendance and overtime" },
  { key: "installations", label: "Installations", icon: Wrench, description: "Progress, inspection, net meter" },
] as const;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("reports.view");
  const sp = await searchParams;
  const report = (REPORTS.some((r) => r.key === one(sp.report)) ? one(sp.report) : "customers") as (typeof REPORTS)[number]["key"];
  const now = new Date();
  const from = one(sp.from) || toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const to = one(sp.to) || toInputDate(now);
  const month = /^\d{4}-\d{2}$/.test(one(sp.month)) ? one(sp.month) : toInputDate(now).slice(0, 7);
  const staffId = one(sp.staffId);
  const village = one(sp.village).trim();
  const status = one(sp.status);

  const [staffOptions, customers] = await Promise.all([
    can(user, "staff.view")
      ? prisma.staff.findMany({ where: await staffScope(user), orderBy: { fullName: "asc" }, select: { id: true, fullName: true } })
      : Promise.resolve([]),
    can(user, "customer.view")
      ? prisma.customer.findMany({
          where: { AND: [await customerScope(user), { isArchived: false }] },
          orderBy: { fullName: "asc" },
          take: 500,
          select: { village: true },
        })
      : Promise.resolve([]),
  ]);
  const villages = Array.from(new Set(customers.map((c) => c.village).filter(Boolean) as string[])).sort();

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59`);
  const monthBounds = monthRange(month);

  const exportParams = new URLSearchParams({ report, format: "pdf", from, to, month });
  if (staffId) exportParams.set("staffId", staffId);
  if (village) exportParams.set("village", village);
  if (status) exportParams.set("status", status);
  const pdfHref = `/api/reports/export?${exportParams.toString()}`;
  exportParams.set("format", "xlsx");
  const xlsxHref = `/api/reports/export?${exportParams.toString()}`;

  let preview: {
    columns: string[];
    rows: (string | number)[][];
    total: number;
    summary: { label: string; value: string }[];
  } = { columns: [], rows: [], total: 0, summary: [] };

  if (report === "customers") {
    const scope = await customerScope(user);
    const where: Prisma.CustomerWhereInput = {
      AND: [
        scope,
        { isArchived: false },
        { applicationDate: { gte: start, lte: end } },
        ...(staffId ? [{ assignedStaffId: staffId }] : []),
        ...(village ? [{ village: { contains: village } }] : []),
        ...(status ? [{ status }] : []),
      ],
    };
    const [total, rows, cost] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { applicationDate: "desc" },
        take: 30,
        include: { assignedStaff: { select: { fullName: true } } },
      }),
      prisma.customer.aggregate({ where, _sum: { systemCost: true } }),
    ]);
    preview = {
      columns: ["Code", "Customer", "Village", "kW", "System cost", "Status", "Assigned"],
      rows: rows.map((r) => [r.customerCode, r.fullName, r.village || "—", r.capacityKw, formatINR(r.systemCost), STATUS_LABELS[r.status] || r.status, r.assignedStaff?.fullName || "—"]),
      total,
      summary: [
        { label: "Customers", value: String(total) },
        { label: "System cost", value: formatINR(cost._sum.systemCost ?? 0) },
      ],
    };
  } else if (report === "staff") {
    const scope = await staffScope(user);
    const where: Prisma.StaffWhereInput = { AND: [scope, ...(status ? [{ status }] : [])] };
    const [total, rows, salary] = await Promise.all([
      prisma.staff.count({ where }),
      prisma.staff.findMany({
        where,
        orderBy: { fullName: "asc" },
        take: 30,
        include: { user: { include: { role: true } } },
      }),
      prisma.staff.aggregate({ where: { AND: [scope, { status: "ACTIVE" }] }, _sum: { monthlySalary: true } }),
    ]);
    preview = {
      columns: ["Employee ID", "Name", "Designation", "Role", "Mobile", "Area", "Salary", "Status"],
      rows: rows.map((r) => [r.employeeId, r.fullName, r.designation, r.user?.role.name || "No login", r.mobile, r.area || "—", formatINR(r.monthlySalary), r.status]),
      total,
      summary: [
        { label: "Staff", value: String(total) },
        { label: "Active monthly salary", value: formatINR(salary._sum.monthlySalary ?? 0) },
      ],
    };
  } else if (report === "payroll") {
    const scope = await staffScope(user);
    const where: Prisma.SalaryWhereInput = {
      AND: [{ staff: scope }, { month }, ...(staffId ? [{ staffId }] : []), ...(status ? [{ status }] : [])],
    };
    const [total, rows, net] = await Promise.all([
      prisma.salary.count({ where }),
      prisma.salary.findMany({ where, orderBy: { staff: { fullName: "asc" } }, take: 30, include: { staff: { select: { fullName: true, employeeId: true } } } }),
      prisma.salary.aggregate({ where, _sum: { netSalary: true } }),
    ]);
    preview = {
      columns: ["Slip", "Employee", "Present", "Absent", "Gross", "Deduction", "Net", "Status"],
      rows: rows.map((r) => [r.slipNo, r.staff.fullName, r.presentDays, r.absentDays, formatINR(r.grossSalary), formatINR(r.advance + r.otherDeduction), formatINR(r.netSalary), r.status]),
      total,
      summary: [
        { label: "Slips", value: String(total) },
        { label: "Net payable", value: formatINR(net._sum.netSalary ?? 0) },
      ],
    };
  } else if (report === "finance") {
    const where: Prisma.TransactionWhereInput = {
      AND: [
        { date: { gte: start, lte: end } },
        ...(status ? [{ type: status }] : []),
        ...(staffId ? [{ staffId }] : []),
        ...(village ? [{ customer: { village: { contains: village } } }] : []),
      ],
    };
    const [total, rows, income, expense] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({ where, orderBy: { date: "desc" }, take: 30, include: { customer: { select: { fullName: true } }, staff: { select: { fullName: true } } } }),
      prisma.transaction.aggregate({ where: { ...where, type: "INCOME" }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...where, type: "EXPENSE" }, _sum: { amount: true } }),
    ]);
    preview = {
      columns: ["Date", "Type", "Category", "Description", "Party", "Mode", "Amount"],
      rows: rows.map((r) => [formatDate(r.date), r.type, CATEGORY_LABELS[r.category] || r.category, r.description || "—", r.customer?.fullName || r.staff?.fullName || "—", r.paymentMode, formatINR(r.amount)]),
      total,
      summary: [
        { label: "Income", value: formatINR(income._sum.amount ?? 0) },
        { label: "Expense", value: formatINR(expense._sum.amount ?? 0) },
        { label: "Net", value: formatINR((income._sum.amount ?? 0) - (expense._sum.amount ?? 0)) },
      ],
    };
  } else if (report === "attendance") {
    const scope = await staffScope(user);
    const where: Prisma.AttendanceWhereInput = {
      AND: [{ staff: scope }, { date: { gte: monthBounds.start, lte: monthBounds.end } }, ...(staffId ? [{ staffId }] : []), ...(status ? [{ status }] : [])],
    };
    const [total, rows] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({ where, orderBy: [{ date: "desc" }], take: 30, include: { staff: { select: { fullName: true, employeeId: true } } } }),
    ]);
    preview = {
      columns: ["Date", "Employee", "Status", "Check-in", "Check-out", "OT", "Note"],
      rows: rows.map((r) => [formatDate(r.date), r.staff.fullName, ATTENDANCE_LABELS[r.status] || r.status, r.checkIn || "—", r.checkOut || "—", r.overtimeHours, r.note || "—"]),
      total,
      summary: [{ label: "Records", value: String(total) }],
    };
  } else {
    const scope = await customerScope(user);
    const where: Prisma.InstallationWhereInput = {
      AND: [
        { customer: { AND: [scope, { isArchived: false }] } },
        { createdAt: { gte: start, lte: end } },
        ...(staffId ? [{ teamLeadId: staffId }] : []),
        ...(village ? [{ customer: { village: { contains: village } } }] : []),
        ...(status ? [{ completionStatus: status }] : []),
      ],
    };
    const [total, rows, completed] = await Promise.all([
      prisma.installation.count({ where }),
      prisma.installation.findMany({ where, orderBy: { updatedAt: "desc" }, take: 30, include: { customer: { select: { fullName: true, customerCode: true, village: true } }, teamLead: { select: { fullName: true } } } }),
      prisma.installation.count({ where: { ...where, completionStatus: "COMPLETED" } }),
    ]);
    preview = {
      columns: ["Customer", "Code", "Village", "kW", "Installed", "Team", "Inspection", "Net meter", "Completion"],
      rows: rows.map((r) => [r.customer.fullName, r.customer.customerCode, r.customer.village || "—", r.capacityKw, formatDate(r.installationDate), r.teamLead?.fullName || "—", r.inspectionStatus, r.netMeterStatus, r.completionStatus]),
      total,
      summary: [
        { label: "Installations", value: String(total) },
        { label: "Completed", value: String(completed) },
      ],
    };
  }

  const activeReport = REPORTS.find((r) => r.key === report)!;

  return (
    <div>
      <PageHeader
        title="Reports & exports"
        subtitle="Date, month, staff aur village filters ke saath PDF / Excel reports."
        eyebrow="Business"
      >
        <a href={pdfHref} className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800">
          <FileText className="h-4 w-4" /> PDF
        </a>
        <a href={xlsxHref} className="inline-flex h-10 items-center gap-2 rounded-lg bg-solar-600 px-4 text-sm font-semibold text-white hover:bg-solar-700">
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </a>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {REPORTS.map((r) => {
          const params = new URLSearchParams({ report: r.key, from, to, month });
          if (staffId) params.set("staffId", staffId);
          if (village) params.set("village", village);
          if (status) params.set("status", status);
          const active = r.key === report;
          return (
            <Link
              key={r.key}
              href={`/app/reports?${params.toString()}`}
              className={`rounded-xl border p-3 transition ${active ? "border-solar-500 bg-solar-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <r.icon className={`h-4 w-4 ${active ? "text-solar-700" : "text-slate-400"}`} />
              <p className={`mt-1.5 text-xs font-bold ${active ? "text-solar-900" : "text-navy-900"}`}>{r.label}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{r.description}</p>
            </Link>
          );
        })}
      </div>

      <Card className="mb-4">
        <form action="/app/reports" className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-6">
          <input type="hidden" name="report" value={report} />
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-500">From</label>
            <input type="date" name="from" defaultValue={from} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-500">To</label>
            <input type="date" name="to" defaultValue={to} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-500">Month</label>
            <Select name="month" defaultValue={month}>
              {monthOptions(18).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-500">Staff</label>
            <Select name="staffId" defaultValue={staffId}>
              <option value="">All staff</option>
              {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-500">Village</label>
            <input name="village" defaultValue={village} list="villages" placeholder="All villages" className="input" />
            <datalist id="villages">
              {villages.map((v) => <option key={v} value={v} />)}
            </datalist>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy-900 px-4 text-xs font-semibold text-white hover:bg-navy-800">
              Apply filters
            </button>
          </div>
          <div className="sm:col-span-2 lg:col-span-6">
            <label className="mb-1 block text-[10px] font-semibold text-slate-500">Status filter (report-specific)</label>
            <input name="status" defaultValue={status} placeholder="e.g. PAID, APPROVED, DOCUMENTS_PENDING, INCOME…" className="input" />
            <p className="mt-1 text-[10px] text-slate-400">
              Payroll / attendance month filter use karte hain; customers / finance / installations date range use karte hain.
            </p>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title={`${activeReport.label} preview`}
          subtitle={`${preview.total} record(s) · ${report === "payroll" || report === "attendance" ? monthLabel(month) : `${formatDate(from)} – ${formatDate(to)}`}`}
          action={
            <span className="text-[11px] text-slate-500">
              Preview shows latest 30 rows · export includes all
            </span>
          }
        />
        {preview.rows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>{preview.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className={typeof cell === "number" ? "text-right text-xs" : "text-xs"}>
                          {typeof cell === "string" && ["APPROVED", "PAID", "COMPLETED", "VERIFIED", "INCOME", "EXPENSE"].includes(cell) ? (
                            <Badge tone={cell === "PAID" || cell === "COMPLETED" || cell === "APPROVED" || cell === "VERIFIED" || cell === "INCOME" ? "success" : "danger"}>{cell}</Badge>
                          ) : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <div className="flex flex-wrap gap-4">
                {preview.summary.map((s) => (
                  <div key={s.label}>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{s.label}</p>
                    <p className="text-xs font-bold text-navy-900">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <a href={pdfHref} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                  <Download className="h-3 w-3" /> PDF
                </a>
                <a href={xlsxHref} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                  <Download className="h-3 w-3" /> Excel
                </a>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="No data for these filters"
            description="Date range, month, staff or village change karke dobara try karein."
          />
        )}
      </Card>
    </div>
  );
}
