import Link from "next/link";
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  FileWarning,
  FolderCheck,
  Network,
  Plus,
  ShieldCheck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { can, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgStats, getOrgTree } from "@/lib/org";
import { Card, LinkButton, PageHeader, StatCard } from "@/components/ui";
import { OrgTreeView } from "@/components/org/org-tree";
import { DesignationManager } from "@/components/org/designation-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organisation Tree" };

export default async function OrgPage() {
  const user = await requirePermission("staff.view");

  const [tree, stats, designations] = await Promise.all([
    getOrgTree(user),
    getOrgStats(user),
    prisma.designation.findMany({
      where: { isActive: true },
      orderBy: [{ level: "desc" }, { name: "asc" }],
      select: { id: true, name: true, level: true, description: true, isSystem: true, department: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <div className="hidden print:mb-4 print:block">
        <div className="flex items-center gap-3">
          <img src="/brand/usha-logo-512.jpg" alt="USHA ENTERPRISES" width={56} height={56} className="h-14 w-14 rounded-lg object-cover" />
          <div>
            <h1 className="text-xl font-bold">USHA ENTERPRISES — Organisation Chart</h1>
            <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString("en-IN")} · {tree.total} employees</p>
          </div>
        </div>
      </div>

      <PageHeader
        title="Organisation tree"
        subtitle="Company hierarchy top-to-bottom, reporting managers aur team strength — sab live database se."
        eyebrow="Human Resources"
      >
        {can(user, "settings.manage") ? <DesignationManager designations={designations} /> : null}
        {can(user, "staff.manage") ? (
          <LinkButton href="/app/staff/new" size="sm"><Plus className="h-3.5 w-3.5" /> Add employee</LinkButton>
        ) : null}
        <LinkButton href="/app/staff" variant="outline" size="sm"><Users className="h-3.5 w-3.5" /> Staff directory</LinkButton>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total strength" value={stats.totalStrength} hint={tree.access.all ? "Entire company" : "Your authorised team"} icon={<Network className="h-5 w-5" />} tone="brand" />
        <StatCard label="Active employees" value={stats.activeEmployees} hint={`${stats.inactiveEmployees} inactive`} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Admins" value={stats.totalAdmins} hint="Administrative accounts" icon={<ShieldCheck className="h-5 w-5" />} tone="purple" />
        <StatCard label="Managers" value={stats.totalManagers} hint={`${stats.totalAreaManagers} area managers`} icon={<UserCog className="h-5 w-5" />} tone="info" />
        <StatCard label="Team leaders" value={stats.totalTeamLeaders} icon={<Users className="h-5 w-5" />} tone="brand" />
        <StatCard label="Field staff" value={stats.totalFieldStaff} hint="Executives & support" icon={<Users className="h-5 w-5" />} tone="neutral" />
        <StatCard label="Customers" value={stats.customers} hint={`${stats.approvedCustomers} approved`} icon={<FolderCheck className="h-5 w-5" />} tone="success" />
        <StatCard label="Applications submitted" value={stats.applicationsSubmitted} hint="Pipeline in progress" icon={<CalendarCheck className="h-5 w-5" />} tone="info" />
        <StatCard label="Pending documents" value={stats.pendingDocuments} hint="Verification queue" icon={<FileWarning className="h-5 w-5" />} tone="warning" />
        <StatCard label="Approved customers" value={stats.approvedCustomers} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Installations done" value={stats.installationsCompleted} icon={<Wrench className="h-5 w-5" />} tone="purple" />
        <StatCard label="Designations" value={designations.length} hint="Configurable levels" icon={<Building2 className="h-5 w-5" />} tone="neutral" />
      </div>

      <Card className="p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-navy-900">Vertical reporting hierarchy</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Super Admin/Admin top par, uske neeche managers, area managers, team leaders aur field staff. Card par click karke profile/transfer dekhein.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{tree.total} employees in view</span>
            <span className="rounded-full bg-solar-50 px-2.5 py-1 text-solar-800">
              {tree.access.all ? "Company-wide access" : "Team access"}
            </span>
          </div>
        </div>

        {tree.roots.length ? (
          <OrgTreeView tree={tree} designations={designations} />
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <Network className="mb-2 h-9 w-9 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No employees in your hierarchy yet.</p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {can(user, "staff.manage")
                ? "Add your first employee and assign a reporting manager — the tree will build automatically."
                : "Ask your administrator to add employees to your team."}
            </p>
            {can(user, "staff.manage") ? (
              <Link href="/app/staff/new" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-solar-600 px-4 py-2 text-xs font-semibold text-white hover:bg-solar-700">
                <Plus className="h-3.5 w-3.5" /> Add first employee
              </Link>
            ) : null}
          </div>
        )}
      </Card>

      <p className="mt-3 text-[10px] text-slate-400">
        Permissions are enforced on the server for every tree view and transfer. Reporting changes are stored in the employee transfer history and audit log.
      </p>
    </div>
  );
}
