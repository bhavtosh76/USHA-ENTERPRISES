import Link from "next/link";
import { Banknote, CalendarCheck, Download, Mail, Phone, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Alert, Badge, Card, CardHeader, InfoRow, PageHeader, StatCard } from "@/components/ui";
import { PasswordForm } from "@/components/profile/password-form";
import { ATTENDANCE_LABELS, LEAVE_TYPES, ROLE_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime, formatINR, maskAccount, monthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  const [record, staff] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true, staff: true },
    }),
    user.staffId
      ? prisma.staff.findUnique({
          where: { id: user.staffId },
          include: {
            reportsTo: { select: { fullName: true } },
            salaries: { orderBy: { month: "desc" }, take: 12 },
            leaves: { orderBy: { createdAt: "desc" }, take: 10 },
            attendance: {
              where: {
                date: {
                  gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  lte: new Date(),
                },
              },
              select: { status: true },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  if (!record) return null;

  const attendanceCounts: Record<string, number> = {};
  for (const a of staff?.attendance ?? []) {
    attendanceCounts[a.status] = (attendanceCounts[a.status] || 0) + 1;
  }
  const present = attendanceCounts.PRESENT || 0;
  const paid = (staff?.salaries ?? []).filter((s) => s.status === "PAID");
  const lastPaid = paid[0];

  return (
    <div>
      <PageHeader
        title="My profile"
        subtitle="Aapki staff details, attendance, salary slips aur account security."
        eyebrow="Account"
      >
        <Link href="/app/notifications" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Notifications
        </Link>
      </PageHeader>

      {user.mustChangePassword ? (
        <div className="mb-4">
          <Alert tone="warning" title="Temporary password active hai">
            Security ke liye abhi naya password set karein. Jab tak aap password change nahi karte, admin ko yeh alert dikhta rahega.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Account" subtitle="Login identity and role" />
            <div className="flex flex-wrap items-center gap-3 p-5">
              {staff?.photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/staff/${staff.id}/photo`} alt={staff.fullName} className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-200" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-full bg-navy-100 text-xl font-bold text-navy-700">
                  {record.name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-lg font-bold text-navy-900">{record.name}</p>
                <p className="text-xs text-slate-500">{record.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone={record.role.key === "SUPER_ADMIN" ? "danger" : record.role.key === "ADMIN" ? "brand" : "info"}>{record.role.name}</Badge>
                  <Badge tone={record.isActive ? "success" : "neutral"}>{record.isActive ? "Active" : "Inactive"}</Badge>
                  {record.mustChangePassword ? <Badge tone="warning">Password change pending</Badge> : null}
                </div>
              </div>
            </div>
            <div className="grid gap-x-8 border-t border-slate-100 p-5 sm:grid-cols-2">
              <div className="divide-y divide-slate-50">
                <InfoRow label="Role key" value={<span className="font-mono text-[11px]">{ROLE_LABELS[record.role.key] || record.role.key}</span>} />
                <InfoRow label="Staff profile" value={staff?.employeeId || "Not linked"} />
                <InfoRow label="Designation" value={staff?.designation || "—"} />
              </div>
              <div className="divide-y divide-slate-50">
                <InfoRow label="Last login" value={record.lastLoginAt ? formatDateTime(record.lastLoginAt) : "—"} />
                <InfoRow label="Member since" value={formatDate(record.createdAt)} />
                <InfoRow label="Password change required" value={record.mustChangePassword ? "Yes" : "No"} />
              </div>
            </div>
          </Card>

          {staff ? (
            <Card>
              <CardHeader title="Staff details" subtitle="HR record — editable by admin / manager" />
              <div className="grid gap-x-8 gap-y-0 p-5 sm:grid-cols-2">
                <div className="divide-y divide-slate-50">
                  <InfoRow label="Employee ID" value={<span className="font-mono text-[11px]">{staff.employeeId}</span>} />
                  <InfoRow label="Designation" value={staff.designation} />
                  <InfoRow label="Department" value={staff.department || "—"} />
                  <InfoRow label="Joining date" value={formatDate(staff.joiningDate)} />
                  <InfoRow label="Reports to" value={staff.reportsTo?.fullName || "—"} />
                  <InfoRow label="Area" value={staff.area || "—"} />
                </div>
                <div className="divide-y divide-slate-50">
                  <InfoRow label="Mobile" value={staff.mobile} />
                  <InfoRow label="Email" value={staff.email || record.email} />
                  <InfoRow label="Monthly salary" value={formatINR(staff.monthlySalary)} />
                  <InfoRow label="Bank" value={staff.bankName || "—"} />
                  <InfoRow label="Account" value={staff.bankAccount ? maskAccount(staff.bankAccount) : "—"} />
                  <InfoRow label="IFSC" value={staff.bankIfsc || "—"} />
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="My salary slips"
              subtitle={staff ? "Last 12 months · PDF download" : "Staff profile linked nahi hai"}
            />
            {staff ? (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr><th>Month</th><th>Slip</th><th className="text-right">Net</th><th>Status</th><th>Paid on</th><th /></tr>
                  </thead>
                  <tbody>
                    {staff.salaries.map((s) => (
                      <tr key={s.id}>
                        <td className="text-xs font-semibold">{monthLabel(s.month)}</td>
                        <td className="font-mono text-[10px] text-slate-500">{s.slipNo}</td>
                        <td className="text-right text-xs font-bold">{formatINR(s.netSalary)}</td>
                        <td><Badge tone={s.status === "PAID" ? "success" : s.status === "APPROVED" ? "info" : "warning"}>{s.status}</Badge></td>
                        <td className="text-[11px] text-slate-500">{s.paidAt ? formatDate(s.paidAt) : "—"}</td>
                        <td className="text-right">
                          {s.status !== "PENDING" ? (
                            <a href={`/api/payroll/${s.id}/slip`} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">
                              <Download className="h-3 w-3" /> PDF
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">Awaiting approval</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!staff.salaries.length ? (
                      <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-500">Abhi koi salary slip generate nahi hui.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-xs text-slate-500">Salary slips staff profile se linked hone par dikhengi.</p>
            )}
          </Card>

          {staff ? (
            <Card>
              <CardHeader title="My leaves" subtitle="Leave requests and decisions" />
              <div className="divide-y divide-slate-100">
                {staff.leaves.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {LEAVE_TYPES.includes(l.type as never) ? l.type : l.type} · {formatDate(l.fromDate)} – {formatDate(l.toDate)}
                      </p>
                      <p className="text-[10px] text-slate-400">{l.reason || "No reason provided"}</p>
                    </div>
                    <Badge tone={l.status === "APPROVED" ? "success" : l.status === "REJECTED" ? "danger" : "warning"}>{l.status}</Badge>
                  </div>
                ))}
                {!staff.leaves.length ? <p className="px-5 py-8 text-center text-xs text-slate-500">Koi leave request nahi.</p> : null}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Security" subtitle="Change your password" />
            <div className="p-4">
              <PasswordForm />
            </div>
          </Card>

          {staff ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Present this month" value={present} icon={<CalendarCheck className="h-5 w-5" />} tone="success" />
                <StatCard label="Last net salary" value={formatINR(lastPaid?.netSalary ?? 0)} icon={<Banknote className="h-5 w-5" />} tone="brand" />
              </div>

              <Card>
                <CardHeader title="Attendance this month" subtitle="Recorded by manager / team leader" />
                <div className="space-y-2 p-4">
                  {Object.keys(attendanceCounts).length ? (
                    Object.entries(attendanceCounts).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{ATTENDANCE_LABELS[key] || key}</span>
                        <span className="font-bold text-navy-900">{value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-center text-xs text-slate-500">Is month ki attendance abhi mark nahi hui.</p>
                  )}
                </div>
              </Card>
            </>
          ) : null}

          <Card>
            <CardHeader title="Contact" subtitle="Company support" />
            <div className="space-y-2 p-4 text-xs text-slate-600">
              <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> Admin se contact karein for HR changes.</p>
              <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /> {record.email}</p>
              <p className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> All actions are audited.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
