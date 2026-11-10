import Link from "next/link";
import { Bell, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { MarkAllRead } from "@/components/notifications/mark-all-read";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("notification.view");
  const sp = await searchParams;
  const filter = one(sp.filter) === "unread" ? "unread" : "all";

  const notifications = await prisma.notification.findMany({
    where: {
      AND: [
        { OR: [{ userId: user.id }, { roleKey: user.roleKey }] },
        ...(filter === "unread" ? [{ isRead: false }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Customer updates, payroll decisions, document verification aur system alerts."
        eyebrow="System"
      >
        <MarkAllRead />
      </PageHeader>

      <div className="mb-4 flex gap-1.5">
        {[
          { key: "all", label: "All notifications" },
          { key: "unread", label: "Unread" },
        ].map((f) => (
          <Link
            key={f.key}
            href={`/app/notifications?filter=${f.key}`}
            className={cn(
              "rounded-lg border px-3.5 py-2 text-xs font-semibold",
              filter === f.key ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {f.label}
          </Link>
        ))}
        <span className="ml-auto self-center text-[11px] text-slate-500">{unread} unread</span>
      </div>

      <Card>
        <div className="divide-y divide-slate-100">
          {notifications.map((n) => {
            const Icon = n.type === "DANGER" || n.type === "WARNING" ? TriangleAlert : n.type === "SUCCESS" ? CheckCircle2 : Info;
            const tone = n.type === "DANGER" ? "text-rose-600 bg-rose-50" : n.type === "WARNING" ? "text-amber-600 bg-amber-50" : n.type === "SUCCESS" ? "text-emerald-600 bg-emerald-50" : "text-sky-600 bg-sky-50";
            return (
              <Link
                key={n.id}
                href={n.link || "/app/notifications"}
                className={cn("flex items-start gap-3 px-4 py-3.5 transition hover:bg-slate-50", !n.isRead && "bg-solar-50/40")}
              >
                <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", tone)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className={cn("text-xs", n.isRead ? "font-semibold text-slate-700" : "font-bold text-navy-900")}>{n.title}</p>
                    {!n.isRead ? <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-solar-500" /> : null}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{n.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {n.createdAt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
        {!notifications.length ? (
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
            description="Naye customer, payroll aur document events yahan dikhenge."
          />
        ) : null}
      </Card>
    </div>
  );
}
