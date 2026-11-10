import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Filter,
  Landmark,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { can, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { customerScope } from "@/lib/access";
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
import { TransactionForm } from "@/components/finance/transaction-form";
import { DeleteTransaction } from "@/components/finance/delete-transaction";
import { BarChart } from "@/components/charts";
import { CATEGORY_LABELS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { formatDate, formatINR, monthLabel, toInputDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("finance.view");
  const sp = await searchParams;
  const now = new Date();
  const defaultFrom = toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const from = one(sp.from) || defaultFrom;
  const to = one(sp.to) || toInputDate(now);
  const type = one(sp.type);
  const category = one(sp.category);
  const q = one(sp.q).trim();
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const pageSize = 25;
  const preselectCustomer = one(sp.customer);

  const rangeFilter: Prisma.TransactionWhereInput = {
    date: {
      gte: new Date(`${from}T00:00:00`),
      lte: new Date(`${to}T23:59:59`),
    },
  };

  const filters: Prisma.TransactionWhereInput[] = [rangeFilter];
  if (type) filters.push({ type });
  if (category) filters.push({ category });
  if (q) {
    filters.push({
      OR: [
        { description: { contains: q } },
        { reference: { contains: q } },
        { customer: { fullName: { contains: q } } },
        { customer: { customerCode: { contains: q } } },
      ],
    });
  }
  const where: Prisma.TransactionWhereInput = { AND: filters };

  const [total, transactions, totals, categoryGroups, monthRows, customers, staff, customerForPreselect] =
    await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: { select: { id: true, fullName: true, customerCode: true } },
          staff: { select: { fullName: true } },
        },
      }),
      prisma.transaction.groupBy({
        by: ["type"],
        where: rangeFilter,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.transaction.groupBy({
        by: ["type", "category"],
        where: rangeFilter,
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.transaction.findMany({
        where: { date: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
        select: { type: true, amount: true, date: true },
      }),
      can(user, "customer.view")
        ? prisma.customer.findMany({
            where: { AND: [await customerScope(user), { isArchived: false }] },
            orderBy: { fullName: "asc" },
            take: 500,
            select: { id: true, fullName: true, customerCode: true },
          })
        : Promise.resolve([]),
      can(user, "staff.view")
        ? prisma.staff.findMany({
            where: { status: "ACTIVE" },
            orderBy: { fullName: "asc" },
            select: { id: true, fullName: true },
          })
        : Promise.resolve([]),
      preselectCustomer
        ? prisma.customer.findUnique({
            where: { id: preselectCustomer },
            select: { id: true, fullName: true, customerCode: true },
          })
        : Promise.resolve(null),
    ]);

  const income = totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0;
  const expense = totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;
  const net = income - expense;
  const incomeCount = totals.find((t) => t.type === "INCOME")?._count._all ?? 0;
  const expenseCount = totals.find((t) => t.type === "EXPENSE")?._count._all ?? 0;

  const months: { label: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString("en-IN", { month: "short" }), income: 0, expense: 0 });
  }
  for (const t of monthRows) {
    const idx =
      (t.date.getFullYear() - new Date(now.getFullYear(), now.getMonth() - 5, 1).getFullYear()) * 12 +
      (t.date.getMonth() - new Date(now.getFullYear(), now.getMonth() - 5, 1).getMonth());
    if (idx < 0 || idx > 5) continue;
    if (t.type === "INCOME") months[idx].income += t.amount;
    else months[idx].expense += t.amount;
  }

  const makeHref = (p: number) => {
    const params = new URLSearchParams({ from, to, page: String(p) });
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    return `/app/finance?${params.toString()}`;
  };

  const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  return (
    <div>
      <PageHeader
        title="Finance & P&L"
        subtitle="Customer payments, subsidy receipts, expenses aur profitability — sab ek jagah."
        eyebrow="Business"
      >
        {can(user, "finance.manage") ? (
          <TransactionForm
            customers={customers}
            staff={staff}
            defaultCustomerId={customerForPreselect?.id}
          />
        ) : null}
      </PageHeader>

      {customerForPreselect ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-900">
          <Banknote className="h-4 w-4" />
          Recording payment for <strong>{customerForPreselect.fullName}</strong> ({customerForPreselect.customerCode}). The customer is preselected in the form.
          <Link href={`/app/customers/${customerForPreselect.id}`} className="ml-auto font-semibold underline">Back to customer</Link>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Income" value={formatINR(income)} hint={`${incomeCount} entries`} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <StatCard label="Expenses" value={formatINR(expense)} hint={`${expenseCount} entries`} icon={<TrendingDown className="h-5 w-5" />} tone="danger" />
        <StatCard label="Net profit" value={formatINR(net)} hint={net >= 0 ? "Profit in selected range" : "Loss in selected range"} icon={<Landmark className="h-5 w-5" />} tone={net >= 0 ? "success" : "danger"} />
        <StatCard label="Transactions" value={incomeCount + expenseCount} hint={`${formatDate(from)} – ${formatDate(to)}`} icon={<Wallet className="h-5 w-5" />} tone="brand" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Income vs expenses" subtitle="Last 6 months" />
          <div className="grid grid-cols-2 gap-4 p-5">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Income</p>
              <BarChart data={months.map((m) => ({ label: m.label, value: m.income }))} height={150} />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Expense</p>
              <BarChart data={months.map((m) => ({ label: m.label, value: m.expense }))} height={150} color="#fb7185" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Category breakdown" subtitle={`Selected range · ${formatDate(from)} – ${formatDate(to)}`} />
          <div className="max-h-64 space-y-2 overflow-y-auto p-4">
            {categoryGroups.map((g) => {
              const amount = g._sum.amount ?? 0;
              const pct = g.type === "INCOME" ? (income ? (amount / income) * 100 : 0) : expense ? (amount / expense) * 100 : 0;
              return (
                <div key={`${g.type}-${g.category}`}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      {g.type === "INCOME" ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-rose-500" />}
                      {CATEGORY_LABELS[g.category] || g.category}
                    </span>
                    <span className="font-semibold text-slate-800">{formatINR(amount)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${g.type === "INCOME" ? "bg-emerald-500" : "bg-rose-400"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
            {!categoryGroups.length ? <p className="py-6 text-center text-xs text-slate-500">No transactions in this range.</p> : null}
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <form action="/app/finance" className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1.4fr_auto]">
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-500">From</label>
            <input type="date" name="from" defaultValue={from} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-500">To</label>
            <input type="date" name="to" defaultValue={to} className="input" />
          </div>
          <Select name="type" defaultValue={type} aria-label="Type">
            <option value="">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </Select>
          <Select name="category" defaultValue={category} aria-label="Category">
            <option value="">All categories</option>
            {allCategories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Description, customer, reference…" className="input pl-9" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-navy-900 px-4 text-xs font-semibold text-white hover:bg-navy-800">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            <Link href="/app/finance" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</Link>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Transactions"
          subtitle={`${total} entries · ${monthLabel(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)}`}
          action={<span className="text-[11px] text-slate-500">Salary payouts appear automatically</span>}
        />
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Customer / Staff</th>
                <th>Mode</th>
                <th className="text-right">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap text-xs">{formatDate(t.date)}</td>
                  <td>
                    <Badge tone={t.type === "INCOME" ? "success" : "danger"}>
                      {t.type === "INCOME" ? "Income" : "Expense"}
                    </Badge>
                  </td>
                  <td className="text-xs">{CATEGORY_LABELS[t.category] || t.category}</td>
                  <td className="max-w-[260px] text-xs">
                    <p className="truncate">{t.description || "—"}</p>
                    {t.reference ? <p className="text-[10px] text-slate-400">Ref: {t.reference}</p> : null}
                  </td>
                  <td className="text-xs">
                    {t.customer ? (
                      <Link href={`/app/customers/${t.customer.id}`} className="font-medium text-navy-800 hover:text-solar-700">{t.customer.fullName}</Link>
                    ) : t.staff ? (
                      <span>{t.staff.fullName}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="text-xs">{t.paymentMode}</td>
                  <td className={`text-right text-sm font-bold ${t.type === "INCOME" ? "text-emerald-700" : "text-rose-600"}`}>
                    {t.type === "INCOME" ? "+" : "−"}{formatINR(t.amount)}
                  </td>
                  <td className="text-right">
                    {can(user, "finance.manage") && t.category !== "SALARY" ? <DeleteTransaction id={t.id} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!transactions.length ? (
          <EmptyState
            icon={<Landmark className="h-5 w-5" />}
            title="No transactions in this range"
            description="Change the dates or record a new income / expense entry."
          />
        ) : (
          <Pagination page={page} pageCount={Math.ceil(total / pageSize)} total={total} makeHref={makeHref} />
        )}
      </Card>
    </div>
  );
}
