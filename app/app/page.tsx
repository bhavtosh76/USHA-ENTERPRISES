import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Contact,
  FileWarning,
  Landmark,
  Plus,
  ReceiptText,
  Sun,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { requireUser, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { customerScope } from "@/lib/access";
import { Badge, Card, CardHeader, LinkButton, Progress, StatCard } from "@/components/ui";
import { BarChart, Donut } from "@/components/charts";
import { formatDate, formatINR, monthLabel } from "@/lib/utils";
import { STATUS_LABELS, STATUS_TONES, CUSTOMER_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const scope = await customerScope(user);
  const customerWhere = { AND: [scope, { isArchived: false }] };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalCustomers,
    newCustomers,
    pendingDocs,
    approvedCustomers,
    pendingSubsidy,
    installations,
    completedInstallations,
    incomeAgg,
    expenseAgg,
    salaryExpenseAgg,
    recentCustomers,
    statusGroups,
    pendingDocList,
    pendingInstallations,
    transactions,
    pendingSalaryCount,
    activeStaff,
    totalStaff,
  ] = await Promise.all([
    prisma.customer.count({ where: customerWhere }),
    prisma.customer.count({ where: { AND: [customerWhere, { createdAt: { gte: monthStart } }] } }),
    prisma.customerDocument.count({
      where: { status: "PENDING", customer: { AND: [scope, { isArchived: false }] } },
    }),
    prisma.customer.count({
      where: {
        AND: [
          customerWhere,
          { status: { in: ["APPROVED", "INSTALLATION_PENDING", "INSTALLATION_COMPLETED", "SUBSIDY_PENDING", "SUBSIDY_RECEIVED"] } },
        ],
      },
    }),
    prisma.customer.count({ where: { AND: [customerWhere, { status: "SUBSIDY_PENDING" }] } }),
    prisma.installation.count({ where: { customer: { AND: [scope, { isArchived: false }] } } }),
    prisma.installation.count({
      where: { customer: { AND: [scope, { isArchived: false }] }, completionStatus: "COMPLETED" },
    }),
    prisma.transaction.aggregate({ where: { type: "INCOME" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: "EXPENSE" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: "EXPENSE", category: "SALARY" }, _sum: { amount: true } }),
    prisma.customer.findMany({
      where: customerWhere,
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { assignedStaff: { select: { fullName: true } } },
    }),
    prisma.customer.groupBy({
      by: ["status"],
      where: customerWhere,
      _count: { _all: true },
    }),
    prisma.customer.findMany({
      where: { AND: [customerWhere, { status: { in: ["DOCUMENTS_PENDING", "DOCUMENTS_RECEIVED"] } }] },
      orderBy: { applicationDate: "asc" },
      take: 5,
      include: { assignedStaff: { select: { fullName: true } } },
    }),
    prisma.customer.findMany({
      where: { AND: [customerWhere, { status: { in: ["APPROVED", "INSTALLATION_PENDING"] } }] },
      orderBy: { applicationDate: "asc" },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: { date: { gte: sixMonthsAgo } },
      select: { type: true, amount: true, date: true },
    }),
    prisma.salary.count({ where: { status: { in: ["PENDING", "APPROVED"] } } }),
    prisma.staff.count({ where: { status: "ACTIVE" } }),
    prisma.staff.count(),
  ]);

  const totalIncome = incomeAgg._sum.amount ?? 0;
  const totalExpense = expenseAgg._sum.amount ?? 0;
  const salaryExpense = salaryExpenseAgg._sum.amount ?? 0;
  const profit = totalIncome - totalExpense;

  // last 6 months series
  const months: { key: string; label: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: d.toLocaleDateString("en-IN", { month: "short" }), income: 0, expense: 0 });
  }
  for (const t of transactions) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = months.find((m) => m.key === key);
    if (!bucket) continue;
    if (t.type === "INCOME") bucket.income += t.amount;
    else bucket.expense += t.amount;
  }

  const statusCounts = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]));
  const pipeline = [
    { label: "Documents", value: (statusCounts.DOCUMENTS_PENDING || 0) + (statusCounts.DOCUMENTS_RECEIVED || 0), color: "#f59e0b" },
    { label: "In process", value: (statusCounts.APPLICATION_SUBMITTED || 0) + (statusCounts.UNDER_PROCESS || 0) + (statusCounts.APPROVED || 0), color: "#2c57a6" },
    { label: "Installation", value: (statusCounts.INSTALLATION_PENDING || 0) + (statusCounts.INSTALLATION_COMPLETED || 0), color: "#197d4b" },
    { label: "Subsidy", value: (statusCounts.SUBSIDY_PENDING || 0) + (statusCounts.SUBSIDY_RECEIVED || 0), color: "#7c3aed" },
    { label: "New", value: statusCounts.NEW || 0, color: "#0ea5e9" },
  ];

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const showFinance = can(user, "finance.view");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-solar-600">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="mt-1 text-xl font-bold text-navy-900 sm:text-2xl">
            {greeting}, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {user.roleName} workspace · {monthLabel(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)} overview
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(user, "customer.create") ? (
            <LinkButton href="/app/customers/new" size="sm">
              <Plus className="h-3.5 w-3.5" /> New customer
            </LinkButton>
          ) : null}
          {can(user, "reports.view") ? (
            <LinkButton href="/app/reports" size="sm" variant="outline">
              <ReceiptText className="h-3.5 w-3.5" /> Reports
            </LinkButton>
          ) : null}
        </div>
      </div>

      {user.mustChangePassword ? (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Aapka password temporary hai. Security ke liye <Link href="/app/profile" className="font-bold underline">profile</Link> se password change karein.
        </div>
      ) : null}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Customers" value={totalCustomers} hint={`${newCustomers} new this month`} icon={<Contact className="h-5 w-5" />} tone="brand" href="/app/customers" />
        <StatCard label="Pending Documents" value={pendingDocs} hint="Awaiting verification" icon={<FileWarning className="h-5 w-5" />} tone={pendingDocs > 0 ? "warning" : "success"} href="/app/customers?status=DOCUMENTS_PENDING" />
        <StatCard label="Approved Customers" value={approvedCustomers} hint="Application approved or beyond" icon={<CheckCircle2 className="h-5 w-5" />} tone="success" href="/app/customers" />
        <StatCard label="Installations" value={installations} hint={`${completedInstallations} completed`} icon={<Wrench className="h-5 w-5" />} tone="info" href="/app/installations" />
        {showFinance ? (
          <>
            <StatCard label="Total Revenue" value={formatINR(totalIncome)} hint="All recorded income" icon={<Landmark className="h-5 w-5" />} tone="success" href="/app/finance" />
            <StatCard label="Total Expenses" value={formatINR(totalExpense)} hint={`Salary ${formatINR(salaryExpense)}`} icon={<Wallet className="h-5 w-5" />} tone="danger" href="/app/finance" />
            <StatCard label="Net Profit" value={formatINR(profit)} hint={profit >= 0 ? "Profitable" : "Loss — review expenses"} icon={<Banknote className="h-5 w-5" />} tone={profit >= 0 ? "success" : "danger"} href="/app/finance" />
            <StatCard label="Pending Salary" value={pendingSalaryCount} hint="Draft / approved slips" icon={<CalendarClock className="h-5 w-5" />} tone="warning" href="/app/payroll" />
          </>
        ) : (
          <>
            <StatCard label="Subsidy Pending" value={pendingSubsidy} hint="Customers awaiting subsidy" icon={<Sun className="h-5 w-5" />} tone="warning" href="/app/customers?status=SUBSIDY_PENDING" />
            <StatCard label="Active Staff" value={activeStaff} hint={`${totalStaff} total staff`} icon={<Users className="h-5 w-5" />} tone="brand" href="/app/staff" />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Income vs Expenses"
            subtitle="Last 6 months recorded transactions"
            action={<Link href="/app/finance" className="text-[11px] font-semibold text-solar-700 hover:underline">View finance</Link>}
          />
          <div className="p-5">
            <div className="mb-3 flex items-center gap-4 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-solar-500" /> Income</span>
              <span className="inline-flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-rose-400" /> Expense</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Income</p>
                <BarChart data={months.map((m) => ({ label: m.label, value: m.income }))} height={150} />
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Expenses</p>
                <BarChart data={months.map((m) => ({ label: m.label, value: m.expense }))} height={150} color="#fb7185" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Customer pipeline" subtitle="Distribution by current status" />
          <div className="p-5">
            <Donut segments={pipeline} centerValue={String(totalCustomers)} centerLabel="Customers" />
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Subsidy pending</span>
                <span className="font-semibold text-slate-800">{pendingSubsidy}</span>
              </div>
              <Progress value={totalCustomers ? (pendingSubsidy / totalCustomers) * 100 : 0} tone="warning" />
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Approved / completed</span>
                <span className="font-semibold text-slate-800">{approvedCustomers}</span>
              </div>
              <Progress value={totalCustomers ? (approvedCustomers / totalCustomers) * 100 : 0} tone="success" />
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent customers"
            subtitle="Latest applications from the field"
            action={<Link href="/app/customers" className="inline-flex items-center gap-1 text-[11px] font-semibold text-solar-700 hover:underline">All customers <ArrowRight className="h-3 w-3" /></Link>}
          />
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Village</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {recentCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/app/customers/${c.id}`} className="font-semibold text-navy-900 hover:text-solar-700">
                        {c.fullName}
                      </Link>
                      <p className="text-[10px] text-slate-400">{c.customerCode}</p>
                    </td>
                    <td className="text-xs">{c.village || "—"}</td>
                    <td className="text-xs">{c.capacityKw} kW</td>
                    <td><Badge tone={STATUS_TONES[c.status] || "neutral"}>{STATUS_LABELS[c.status] || c.status}</Badge></td>
                    <td className="text-xs text-slate-500">{c.assignedStaff?.fullName || "Unassigned"}</td>
                  </tr>
                ))}
                {!recentCustomers.length ? (
                  <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-500">No customers yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Pending work" subtitle="Action required" />
          <div className="divide-y divide-slate-100">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">Documents pending</p>
                <Badge tone="warning">{pendingDocList.length}</Badge>
              </div>
              <div className="mt-2 space-y-1.5">
                {pendingDocList.slice(0, 3).map((c) => (
                  <Link key={c.id} href={`/app/customers/${c.id}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-[11px] hover:bg-slate-50">
                    <span className="truncate text-slate-600">{c.fullName}</span>
                    <ArrowUpRight className="h-3 w-3 text-slate-400" />
                  </Link>
                ))}
                {!pendingDocList.length ? <p className="px-2 text-[11px] text-slate-400">Nothing pending 🎉</p> : null}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">Installation pending</p>
                <Badge tone="info">{pendingInstallations.length}</Badge>
              </div>
              <div className="mt-2 space-y-1.5">
                {pendingInstallations.slice(0, 3).map((c) => (
                  <Link key={c.id} href={`/app/customers/${c.id}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-[11px] hover:bg-slate-50">
                    <span className="truncate text-slate-600">{c.fullName} · {c.capacityKw} kW</span>
                    <ArrowUpRight className="h-3 w-3 text-slate-400" />
                  </Link>
                ))}
                {!pendingInstallations.length ? <p className="px-2 text-[11px] text-slate-400">Nothing pending 🎉</p> : null}
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-slate-700">Quick actions</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {[
                  { href: "/app/attendance", label: "Attendance", perm: "attendance.view" },
                  { href: "/app/payroll", label: "Payroll", perm: "payroll.view" },
                  { href: "/app/finance", label: "Add income", perm: "finance.manage" },
                  { href: "/app/subsidy-schemes", label: "Subsidy rates", perm: "subsidy.manage" },
                ].filter((a) => can(user, a.perm)).map((a) => (
                  <Link key={a.href} href={a.href} className="rounded-md border border-slate-200 px-2.5 py-2 text-[11px] font-medium text-slate-600 hover:border-solar-300 hover:bg-solar-50">
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {can(user, "staff.view") ? (
        <Card className="mt-4">
          <CardHeader
            title="Staff snapshot"
            subtitle={`${activeStaff} active of ${totalStaff} staff members`}
            action={<Link href="/app/staff" className="text-[11px] font-semibold text-solar-700 hover:underline">Manage staff</Link>}
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active staff", value: activeStaff, hint: "Currently working" },
              { label: "Pending salary", value: pendingSalaryCount, hint: "Slips awaiting action" },
              { label: "Pending documents", value: pendingDocs, hint: "Across customers" },
              { label: "Subsidy pending", value: pendingSubsidy, hint: "Awaiting disbursement" },
            ].map((x) => (
              <div key={x.label} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{x.label}</p>
                <p className="mt-1 text-xl font-bold text-navy-900">{x.value}</p>
                <p className="text-[10px] text-slate-400">{x.hint}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <p className="mt-6 text-center text-[10px] text-slate-400">
        {CUSTOMER_STATUSES.length} customer stages tracked · All amounts in INR · {formatDate(new Date())}
      </p>
    </div>
  );
}
