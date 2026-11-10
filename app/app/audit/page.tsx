import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Filter, KeyRound, Search, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Select, StatCard } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

const TABS = [
  { key: "audit", label: "Audit trail", icon: ShieldCheck },
  { key: "login", label: "Login history", icon: KeyRound },
];

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("audit.view");
  const sp = await searchParams;
  const tab = one(sp.tab) === "login" ? "login" : "audit";
  const q = one(sp.q).trim();
  const action = one(sp.action);
  const entity = one(sp.entity);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const pageSize = 30;

  const [actions, entities, users] = await Promise.all([
    prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true } }),
    prisma.auditLog.groupBy({ by: ["entity"], _count: { _all: true } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  let total = 0;
  let rows: {
    id: string;
    createdAt: string;
    primary: string;
    secondary: string;
    badge: string;
    tone: "success" | "danger" | "info" | "neutral";
    meta: string;
    ip: string;
  }[] = [];

  if (tab === "audit") {
    const filters: Prisma.AuditLogWhereInput[] = [];
    if (q) {
      filters.push({
        OR: [
          { userName: { contains: q } },
          { entityId: { contains: q } },
          { details: { contains: q } },
          { action: { contains: q } },
        ],
      });
    }
    if (action) filters.push({ action });
    if (entity) filters.push({ entity });
    const where: Prisma.AuditLogWhereInput = filters.length ? { AND: filters } : {};

    const [count, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    total = count;
    rows = logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      primary: `${l.action} · ${l.entity}`,
      secondary: `${l.userName || "System"}${l.entityId ? ` · ${l.entityId.slice(0, 14)}…` : ""}`,
      badge: l.action,
      tone: ["DELETE", "REJECT", "FAILED", "DEACTIVATE"].includes(l.action) ? "danger" : ["CREATE", "APPROVE", "PAY", "VERIFY"].includes(l.action) ? "success" : "info",
      meta: l.details || "",
      ip: l.ip || "—",
    }));
  } else {
    const where: Prisma.LoginHistoryWhereInput = q ? { OR: [{ email: { contains: q } }, { ip: { contains: q } }] } : {};
    const [count, logs] = await Promise.all([
      prisma.loginHistory.count({ where }),
      prisma.loginHistory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    total = count;
    rows = logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      primary: l.email,
      secondary: l.success ? "Successful login" : "Failed login attempt",
      badge: l.success ? "SUCCESS" : "FAILED",
      tone: l.success ? "success" : "danger",
      meta: l.userAgent || "",
      ip: l.ip || "—",
    }));
  }

  const makeHref = (p: number) => {
    const params = new URLSearchParams({ tab, page: String(p) });
    if (q) params.set("q", q);
    if (action) params.set("action", action);
    if (entity) params.set("entity", entity);
    return `/app/audit?${params.toString()}`;
  };

  const failedLogins = tab === "login" ? rows.filter((r) => r.badge === "FAILED").length : 0;

  return (
    <div>
      <PageHeader
        title="Audit & security"
        subtitle="Har sensitive action, document access aur login attempt timestamped record hota hai."
        eyebrow="System"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Audit entries" value={actions.reduce((s, a) => s + a._count._all, 0)} icon={<ShieldCheck className="h-5 w-5" />} tone="brand" />
        <StatCard label="Distinct actions" value={actions.length} tone="info" />
        <StatCard label="Entities tracked" value={entities.length} tone="purple" />
        <StatCard label="User accounts" value={users.length} tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-card">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={`/app/audit?tab=${t.key}`}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${active ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </Link>
          );
        })}
      </div>

      <Card className="mb-4">
        <form action="/app/audit" className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_auto]">
          <input type="hidden" name="tab" value={tab} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder={tab === "login" ? "Email or IP…" : "User, action, entity ID, details…"} className="input pl-9" />
          </div>
          {tab === "audit" ? (
            <>
              <Select name="action" defaultValue={action} aria-label="Action">
                <option value="">All actions</option>
                {actions.map((a) => <option key={a.action} value={a.action}>{a.action} ({a._count._all})</option>)}
              </Select>
              <Select name="entity" defaultValue={entity} aria-label="Entity">
                <option value="">All entities</option>
                {entities.map((e) => <option key={e.entity} value={e.entity}>{e.entity} ({e._count._all})</option>)}
              </Select>
            </>
          ) : (
            <div className="sm:col-span-2" />
          )}
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-navy-900 px-4 text-xs font-semibold text-white hover:bg-navy-800">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            <Link href={`/app/audit?tab=${tab}`} className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</Link>
          </div>
        </form>
      </Card>

      {tab === "login" && failedLogins > 0 ? (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800">
          {failedLogins} failed login attempt(s) on this page. Repeated failures ke liye user ka password reset karein.
        </div>
      ) : null}

      <Card>
        <CardHeader
          title={tab === "audit" ? "Audit trail" : "Login history"}
          subtitle={`${total} record${total === 1 ? "" : "s"}`}
        />
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Time</th>
                <th>{tab === "audit" ? "Action" : "Account"}</th>
                <th>Details</th>
                <th>IP</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-[11px] text-slate-500">{formatDateTime(r.createdAt)}</td>
                  <td>
                    <p className="text-xs font-semibold text-navy-900">{r.primary}</p>
                    <p className="text-[10px] text-slate-400">{r.secondary}</p>
                  </td>
                  <td className="max-w-[420px]">
                    <p className="truncate font-mono text-[10px] text-slate-500">{r.meta || "—"}</p>
                  </td>
                  <td className="text-[11px] text-slate-500">{r.ip}</td>
                  <td><Badge tone={r.tone}>{r.badge}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="No records found" description="Filters change karke dobara try karein." />
        ) : (
          <Pagination page={page} pageCount={Math.ceil(total / pageSize)} total={total} makeHref={makeHref} />
        )}
      </Card>
    </div>
  );
}
