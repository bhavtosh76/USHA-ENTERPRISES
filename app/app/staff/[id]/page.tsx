import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  Banknote,
  CalendarCheck,
  Edit3,
  History,
  Mail,
  MapPin,
  Phone,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import { requirePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffScope } from "@/lib/access";
import { collectDescendantIds } from "@/lib/org";
import { Avatar, Badge, Card, CardHeader, InfoRow, LinkButton, StatCard } from "@/components/ui";
import { PhotoUploader } from "@/components/staff/photo-uploader";
import { StaffDangerZone } from "@/components/staff/staff-danger";
import { ATTENDANCE_LABELS, STATUS_LABELS, STATUS_TONES } from "@/lib/constants";
import { formatDate, formatINR, maskAccount, monthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("staff.view");
  const { id } = await params;

  const scope = await staffScope(user);
  const allowed = await prisma.staff.findFirst({ where: { AND: [{ id }, scope] }, select: { id: true } });
  if (!allowed) notFound();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const isSelf = user.staffId === id;
  const canSeeSalary = can(user, "payroll.view") || isSelf;

  const [staff, customerCount, pipelineAgg, salariesAgg, hierarchy] = await Promise.all([
    prisma.staff.findUnique({
      where: { id },
      include: {
        user: { include: { role: true } },
        reportsTo: { select: { id: true, fullName: true, designation: true } },
        subordinates: { select: { id: true, fullName: true, designation: true, status: true } },
        salaries: { orderBy: { month: "desc" }, take: 12 },
        attendance: { where: { date: { gte: monthStart, lte: monthEnd } }, orderBy: { date: "asc" } },
        customers: {
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, fullName: true, customerCode: true, status: true, village: true, capacityKw: true, systemCost: true },
        },
        leaves: { orderBy: { createdAt: "desc" }, take: 8 },
        transfers: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { transferredBy: { select: { name: true } } },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { changedBy: { select: { name: true } } },
        },
      },
    }),
    prisma.customer.count({ where: { assignedStaffId: id, isArchived: false } }),
    prisma.customer.aggregate({ where: { assignedStaffId: id, isArchived: false }, _sum: { systemCost: true } }),
    prisma.salary.aggregate({ where: { staffId: id, status: "PAID" }, _sum: { netSalary: true } }),
    prisma.staff.findMany({ select: { id: true, fullName: true, reportsToId: true } }),
  ]);

  if (!staff) notFound();

  const teamSize = Math.max(0, collectDescendantIds(hierarchy, id).size - 1);
  const nameById = new Map(hierarchy.map((h) => [h.id, h.fullName]));
  const present = staff.attendance.filter((a) => a.status === "PRESENT" || a.status === "HALF_DAY").length;
  const absent = staff.attendance.filter((a) => a.status === "ABSENT" || a.status === "UNPAID_LEAVE").length;
  const lastSalary = staff.salaries[0];
  const pipeline = pipelineAgg._sum.systemCost ?? 0;
  const achievement = staff.targetMonthly > 0 ? Math.min(100, Math.round((pipeline / staff.targetMonthly) * 100)) : 0;

  return (
    <div>
      <Link href="/app/staff" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-3.5 w-3.5" /> All staff
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar
              name={staff.fullName}
              src={staff.photoPath ? `/api/staff/${staff.id}/photo` : null}
              size={64}
            />
            {can(user, "staff.manage") || isSelf ? (
              <PhotoUploader staffId={staff.id} hasPhoto={Boolean(staff.photoPath)} />
            ) : null}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-navy-900">{staff.fullName}</h1>
              <Badge tone={staff.status === "ACTIVE" ? "success" : staff.status === "TERMINATED" ? "danger" : "neutral"}>{staff.status}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {staff.employeeId} · {staff.designation}{staff.department ? ` · ${staff.department}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
              <a href={`tel:${staff.mobile}`} className="inline-flex items-center gap-1 hover:text-solar-700"><Phone className="h-3 w-3" /> {staff.mobile}</a>
              {staff.email ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {staff.email}</span> : null}
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {staff.area || "—"}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(user, "attendance.manage") ? (
            <LinkButton href={`/app/attendance?staff=${staff.id}`} variant="outline" size="sm"><CalendarCheck className="h-3.5 w-3.5" /> Attendance</LinkButton>
          ) : null}
          {can(user, "payroll.view") ? (
            <LinkButton href={`/app/payroll?staff=${staff.id}`} variant="outline" size="sm"><Banknote className="h-3.5 w-3.5" /> Payroll</LinkButton>
          ) : null}
          {can(user, "staff.manage") ? (
            <LinkButton href={`/app/staff/${staff.id}/edit`} size="sm"><Edit3 className="h-3.5 w-3.5" /> Edit profile</LinkButton>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Present this month" value={present} hint={`${absent} absent / leave`} icon={<UserCheck className="h-5 w-5" />} tone="success" />
        <StatCard label="Assigned customers" value={customerCount} icon={<Users className="h-5 w-5" />} tone="brand" />
        <StatCard label="Pipeline value" value={formatINR(pipeline)} hint={`${achievement}% of monthly target`} icon={<Target className="h-5 w-5" />} tone="info" />
        {canSeeSalary ? (
          <StatCard label="Last net salary" value={lastSalary ? formatINR(lastSalary.netSalary) : "—"} hint={lastSalary ? `${monthLabel(lastSalary.month)} · ${lastSalary.status}` : "No payroll yet"} icon={<Banknote className="h-5 w-5" />} tone="purple" />
        ) : (
          <StatCard label="Total team" value={teamSize} hint={`${staff.subordinates.length} direct reports`} icon={<Users className="h-5 w-5" />} tone="purple" />
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Employment & personal details" />
            <div className="grid gap-x-8 gap-y-0 p-5 sm:grid-cols-2">
              <div className="divide-y divide-slate-50">
                <InfoRow label="Employee ID" value={<span className="font-mono text-[11px]">{staff.employeeId}</span>} />
                <InfoRow label="Designation" value={staff.designation} />
                <InfoRow label="Department" value={staff.department || "—"} />
                <InfoRow label="Joining date" value={formatDate(staff.joiningDate)} />
                <InfoRow label="Work area" value={staff.area || "—"} />
                <InfoRow label="Reports to" value={staff.reportsTo ? <Link className="link" href={`/app/staff/${staff.reportsTo.id}`}>{staff.reportsTo.fullName}</Link> : "—"} />
              </div>
              <div className="divide-y divide-slate-50">
                <InfoRow label="Mobile" value={staff.mobile} />
                <InfoRow label="Alternate mobile" value={staff.altMobile || "—"} />
                <InfoRow label="Email" value={staff.email || "—"} />
                <InfoRow label="Address" value={staff.address || "—"} />
                <InfoRow label="Login role" value={<Badge tone="brand">{staff.user?.role.name || "No login"}</Badge>} />
                <InfoRow label="Login status" value={staff.user?.isActive ? "Active" : "Disabled"} />
              </div>
            </div>
            {staff.notes ? (
              <div className="border-t border-slate-100 px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Internal notes</p>
                <p className="mt-1 text-xs text-slate-600">{staff.notes}</p>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              title="Team & reporting history"
              subtitle={`${staff.subordinates.length} direct reports · ${teamSize} total team strength`}
              action={<Link href="/app/org" className="text-[11px] font-semibold text-solar-700 hover:underline">Open org tree</Link>}
            />
            <div className="grid gap-0 px-5 py-3 sm:grid-cols-2">
              <div className="pr-0 sm:pr-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Direct reports</p>
                <ul className="mt-2 space-y-1.5">
                  {staff.subordinates.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                      <Link href={`/app/staff/${s.id}`} className="font-medium text-navy-900 hover:text-solar-700">{s.fullName}</Link>
                      <span className="text-[10px] text-slate-400">{s.designation} · {s.status}</span>
                    </li>
                  ))}
                  {!staff.subordinates.length ? <li className="text-xs text-slate-400">No direct reports.</li> : null}
                </ul>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><UserCheck className="h-3 w-3" /> Reports to</p>
                <p className="mt-2 text-xs font-semibold text-navy-900">
                  {staff.reportsTo ? <Link href={`/app/staff/${staff.reportsTo.id}`} className="hover:text-solar-700">{staff.reportsTo.fullName}</Link> : "Top level (no manager)"}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">{staff.reportsTo?.designation || "—"}</p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Total team strength</p>
                <p className="mt-1 text-lg font-bold text-navy-900">{teamSize}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><History className="h-3 w-3" /> Transfer & reporting history</p>
              <ul className="mt-2 divide-y divide-slate-50">
                {staff.transfers.map((t) => (
                  <li key={t.id} className="py-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5 text-slate-700">
                      <ArrowLeftRight className="h-3 w-3 text-slate-400" />
                      <span className="font-medium">{t.fromManagerId ? nameById.get(t.fromManagerId) || "—" : "No manager"}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-medium">{t.toManagerId ? nameById.get(t.toManagerId) || "—" : "No manager"}</span>
                      {t.fromDesignation !== t.toDesignation ? (
                        <span className="text-slate-400">· {t.fromDesignation || "—"} → {t.toDesignation}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {formatDate(t.effectiveDate)} · by {t.transferredBy?.name || "system"}
                      {t.reason ? ` · ${t.reason}` : ""}
                    </p>
                  </li>
                ))}
                {!staff.transfers.length ? <li className="py-2 text-[11px] text-slate-400">No transfers recorded yet.</li> : null}
              </ul>
            </div>
          </Card>

          {canSeeSalary ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader title="Salary structure" />
              <div className="divide-y divide-slate-50 px-5 py-2">
                <InfoRow label="Fixed monthly" value={formatINR(staff.monthlySalary)} />
                <InfoRow label="Monthly target" value={formatINR(staff.targetMonthly)} />
                <InfoRow label="Incentive rate" value={`${staff.incentiveRate}%`} />
                <InfoRow label="Commission rate" value={`${staff.commissionRate}%`} />
                <InfoRow label="Total paid (recorded)" value={formatINR(salariesAgg._sum.netSalary ?? 0)} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Bank details" />
              <div className="divide-y divide-slate-50 px-5 py-2">
                <InfoRow label="Bank" value={staff.bankName || "—"} />
                <InfoRow label="Account" value={staff.bankAccount ? maskAccount(staff.bankAccount) : "—"} />
                <InfoRow label="IFSC" value={staff.bankIfsc || "—"} />
              </div>
              <p className="px-5 pb-3 text-[10px] text-slate-400">
                Full account number sirf payroll processing ke liye authorised users ke paas hai.
              </p>
            </Card>
          </div>
          ) : null}

          <Card>
            <CardHeader
              title="Assigned customers"
              subtitle={`${customerCount} total assigned`}
              action={<Link href={`/app/customers?staff=${staff.id}`} className="text-[11px] font-semibold text-solar-700 hover:underline">View all</Link>}
            />
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Customer</th><th>Village</th><th className="text-right">kW</th><th>Status</th><th className="text-right">Cost</th></tr></thead>
                <tbody>
                  {staff.customers.map((c) => (
                    <tr key={c.id}>
                      <td><Link href={`/app/customers/${c.id}`} className="text-xs font-semibold text-navy-900 hover:text-solar-700">{c.fullName}</Link><p className="text-[10px] text-slate-400">{c.customerCode}</p></td>
                      <td className="text-xs">{c.village || "—"}</td>
                      <td className="text-right text-xs">{c.capacityKw}</td>
                      <td><Badge tone={STATUS_TONES[c.status] || "neutral"}>{STATUS_LABELS[c.status] || c.status}</Badge></td>
                      <td className="text-right text-xs">{formatINR(c.systemCost)}</td>
                    </tr>
                  ))}
                  {!staff.customers.length ? <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-500">No customers assigned.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </Card>

          {canSeeSalary ? (
          <Card>
            <CardHeader title="Salary history" subtitle="Last 12 payroll records" />
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Month</th><th className="text-right">Gross</th><th className="text-right">Deductions</th><th className="text-right">Net</th><th>Status</th><th>Slip</th></tr></thead>
                <tbody>
                  {staff.salaries.map((s) => (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap text-xs font-medium">{monthLabel(s.month)}</td>
                      <td className="text-right text-xs">{formatINR(s.grossSalary)}</td>
                      <td className="text-right text-xs text-rose-600">{formatINR(s.advance + s.otherDeduction)}</td>
                      <td className="text-right text-xs font-bold">{formatINR(s.netSalary)}</td>
                      <td><Badge tone={s.status === "PAID" ? "success" : s.status === "APPROVED" ? "info" : "warning"}>{s.status}</Badge></td>
                      <td>
                        <a href={`/api/payroll/${s.id}/slip`} className="text-[11px] font-semibold text-solar-700 hover:underline">PDF</a>
                      </td>
                    </tr>
                  ))}
                  {!staff.salaries.length ? <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-500">No salary records yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="This month's attendance" subtitle={monthLabel(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)} action={can(user, "attendance.manage") ? <Link href={`/app/attendance?staff=${staff.id}`} className="text-[11px] font-semibold text-solar-700">Mark</Link> : null} />
            <div className="p-5">
              <div className="grid grid-cols-7 gap-1">
                {staff.attendance.map((a) => (
                  <div
                    key={a.id}
                    title={`${formatDate(a.date)} — ${ATTENDANCE_LABELS[a.status] || a.status}`}
                    className={`grid h-7 place-items-center rounded text-[10px] font-semibold ${
                      a.status === "PRESENT"
                        ? "bg-emerald-100 text-emerald-700"
                        : a.status === "ABSENT"
                          ? "bg-rose-100 text-rose-700"
                          : a.status === "HALF_DAY"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {new Date(a.date).getDate()}
                  </div>
                ))}
                {!staff.attendance.length ? <p className="col-span-7 py-4 text-center text-[11px] text-slate-400">No attendance marked this month.</p> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-200" /> Present</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-rose-200" /> Absent</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-200" /> Half day</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Leave records" subtitle="Latest requests" />
            <div className="divide-y divide-slate-100">
              {staff.leaves.map((l) => (
                <div key={l.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-slate-700">{l.type} leave</p>
                    <Badge tone={l.status === "APPROVED" ? "success" : l.status === "REJECTED" ? "danger" : "warning"}>{l.status}</Badge>
                  </div>
                  <p className="text-[10px] text-slate-500">{formatDate(l.fromDate)} → {formatDate(l.toDate)}</p>
                  {l.reason ? <p className="text-[10px] text-slate-400">{l.reason}</p> : null}
                </div>
              ))}
              {!staff.leaves.length ? <p className="px-4 py-6 text-center text-[11px] text-slate-400">No leave requests.</p> : null}
            </div>
          </Card>

          {staff.subordinates.length ? (
            <Card>
              <CardHeader title="Team members" subtitle={`${staff.subordinates.length} reporting`} />
              <div className="divide-y divide-slate-100">
                {staff.subordinates.map((s) => (
                  <Link key={s.id} href={`/app/staff/${s.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-700">{s.fullName}</p>
                      <p className="text-[10px] text-slate-400">{s.designation}</p>
                    </div>
                    <Badge tone={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status}</Badge>
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          {can(user, "staff.manage") && !isSelf && staff.user?.role.key !== "SUPER_ADMIN" ? (
            <StaffDangerZone staffId={staff.id} name={staff.fullName} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
