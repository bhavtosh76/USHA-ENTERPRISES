import Link from "next/link";
import { CalendarDays, Download, Users } from "lucide-react";
import { requirePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffScope } from "@/lib/access";
import { AttendanceMarker } from "@/components/attendance/attendance-marker";
import { LeaveActions } from "@/components/attendance/leave-actions";
import { Badge, Card, CardHeader, LinkButton, PageHeader, StatCard } from "@/components/ui";
import { ATTENDANCE_LABELS } from "@/lib/constants";
import { formatDate, monthLabel, startOfDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

const CELL: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-800",
  ABSENT: "bg-rose-100 text-rose-800",
  HALF_DAY: "bg-amber-100 text-amber-800",
  PAID_LEAVE: "bg-sky-100 text-sky-800",
  UNPAID_LEAVE: "bg-orange-100 text-orange-800",
  HOLIDAY: "bg-slate-100 text-slate-600",
};

const SHORT: Record<string, string> = {
  PRESENT: "P",
  ABSENT: "A",
  HALF_DAY: "H",
  PAID_LEAVE: "PL",
  UNPAID_LEAVE: "UL",
  HOLIDAY: "HO",
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("attendance.view");
  const sp = await searchParams;
  const today = new Date();
  const dateStr = one(sp.date) || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const month = one(sp.month) || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const staffFilter = one(sp.staff);

  const selectedDate = startOfDay(new Date(dateStr));
  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, (m || 1) - 1, 1);
  const monthEnd = new Date(y, m || 1, 0, 23, 59, 59);
  const daysInMonth = new Date(y, m || 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const scope = await staffScope(user);

  const staff = await prisma.staff.findMany({
    where: { AND: [scope, staffFilter ? { id: staffFilter } : {}] },
    orderBy: [{ status: "asc" }, { fullName: "asc" }],
    select: { id: true, fullName: true, designation: true, employeeId: true, status: true },
  });

  const [existing, monthRecords, leaves] = await Promise.all([
    prisma.attendance.findMany({ where: { date: selectedDate, staffId: { in: staff.map((s) => s.id) } } }),
    prisma.attendance.findMany({
      where: { date: { gte: monthStart, lte: monthEnd }, staffId: { in: staff.map((s) => s.id) } },
      select: { staffId: true, date: true, status: true },
    }),
    prisma.leaveRequest.findMany({
      where: { status: "PENDING", staffId: { in: staff.map((s) => s.id) } },
      orderBy: { createdAt: "desc" },
      include: { staff: { select: { fullName: true, employeeId: true } } },
    }),
  ]);

  const existingMap = Object.fromEntries(
    existing.map((e) => [
      e.staffId,
      { status: e.status, checkIn: e.checkIn, checkOut: e.checkOut, overtimeHours: e.overtimeHours, note: e.note },
    ]),
  );

  const gridMap = new Map<string, string>();
  monthRecords.forEach((r) => {
    gridMap.set(`${r.staffId}-${new Date(r.date).getDate()}`, r.status);
  });

  const presentToday = existing.filter((e) => e.status === "PRESENT" || e.status === "HALF_DAY").length;
  const absentToday = existing.filter((e) => e.status === "ABSENT" || e.status === "UNPAID_LEAVE").length;
  const unmarked = staff.filter((s) => !existingMap[s.id]).length;

  const monthParam = `${y}-${String(m || 1).padStart(2, "0")}`;

  return (
    <div>
      <PageHeader title="Attendance register" subtitle="Daily attendance, monthly register aur leave approvals." eyebrow="Human Resources">
        {can(user, "reports.view") ? (
          <LinkButton href={`/app/reports?type=attendance&month=${monthParam}`} variant="outline" size="sm">
            <Download className="h-3.5 w-3.5" /> Export
          </LinkButton>
        ) : null}
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Present today" value={presentToday} hint={formatDate(selectedDate)} tone="success" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Absent today" value={absentToday} tone="danger" />
        <StatCard label="Not marked" value={unmarked} tone="warning" />
        <StatCard label="Pending leaves" value={leaves.length} tone="info" icon={<CalendarDays className="h-5 w-5" />} />
      </div>

      <Card className="mb-4">
        <form action="/app/attendance" className="flex flex-wrap items-end gap-3 p-3">
          <div>
            <label className="label">Attendance date</label>
            <input type="date" name="date" defaultValue={dateStr} className="input" />
          </div>
          <div>
            <label className="label">Register month</label>
            <input type="month" name="month" defaultValue={month} className="input" />
          </div>
          {staffFilter ? <input type="hidden" name="staff" value={staffFilter} /> : null}
          <button type="submit" className="h-10 rounded-lg bg-navy-900 px-4 text-xs font-semibold text-white hover:bg-navy-800">Load</button>
          {staffFilter ? <Link href="/app/attendance" className="h-10 rounded-lg border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-600">Show all staff</Link> : null}
        </form>
      </Card>

      <div className="mb-4">
        <AttendanceMarker
          staff={staff.filter((s) => s.status === "ACTIVE")}
          date={dateStr}
          existing={existingMap}
          canManage={can(user, "attendance.manage")}
        />
      </div>

      <Card className="mb-4">
        <CardHeader title={`Monthly register — ${monthLabel(month)}`} subtitle="P = Present, A = Absent, H = Half day, PL = Paid leave, UL = Unpaid leave" />
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 min-w-[150px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                {days.map((d) => {
                  const dow = new Date(y, (m || 1) - 1, d).getDay();
                  return (
                    <th key={d} className={`min-w-[26px] border-b border-slate-200 px-1 py-2 text-center font-semibold ${dow === 0 ? "text-rose-400" : "text-slate-500"}`}>
                      {d}
                    </th>
                  );
                })}
                <th className="border-b border-slate-200 px-2 py-2 text-center font-semibold text-slate-500">P</th>
                <th className="border-b border-slate-200 px-2 py-2 text-center font-semibold text-slate-500">A</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                let p = 0;
                let a = 0;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-3 py-1.5">
                      <Link href={`/app/staff/${s.id}`} className="text-[11px] font-semibold text-navy-900 hover:text-solar-700">{s.fullName}</Link>
                      <p className="text-[9px] text-slate-400">{s.employeeId}</p>
                    </td>
                    {days.map((d) => {
                      const status = gridMap.get(`${s.id}-${d}`);
                      if (status === "PRESENT" || status === "HALF_DAY") p += 1;
                      if (status === "ABSENT" || status === "UNPAID_LEAVE") a += 1;
                      const dow = new Date(y, (m || 1) - 1, d).getDay();
                      return (
                        <td key={d} className={`border-b border-slate-100 p-0.5 text-center ${dow === 0 ? "bg-rose-50/40" : ""}`}>
                          {status ? (
                            <span title={`${s.fullName} — ${d}/${m}/${y}: ${ATTENDANCE_LABELS[status] || status}`} className={`mx-auto grid h-5 w-5 place-items-center rounded text-[8px] font-bold ${CELL[status] || "bg-slate-100 text-slate-500"}`}>
                              {SHORT[status] || "?"}
                            </span>
                          ) : (
                            <span className="text-slate-200">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-slate-100 px-2 text-center font-semibold text-emerald-700">{p}</td>
                    <td className="border-b border-slate-100 px-2 text-center font-semibold text-rose-600">{a}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Pending leave requests" subtitle="Approve karne par attendance register auto-fill ho jata hai" />
        <div className="divide-y divide-slate-100">
          {leaves.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">{l.staff.fullName} <span className="font-normal text-slate-400">({l.staff.employeeId})</span></p>
                <p className="text-[11px] text-slate-500">{l.type} leave · {formatDate(l.fromDate)} → {formatDate(l.toDate)}</p>
                {l.reason ? <p className="text-[10px] text-slate-400">{l.reason}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="warning">PENDING</Badge>
                {can(user, "attendance.manage") ? <LeaveActions leaveId={l.id} /> : null}
              </div>
            </div>
          ))}
          {!leaves.length ? <p className="px-5 py-8 text-center text-xs text-slate-500">No pending leave requests.</p> : null}
        </div>
      </Card>
    </div>
  );
}
