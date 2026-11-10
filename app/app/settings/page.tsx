import Link from "next/link";
import { Building2, ShieldCheck, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { CompanyForm, type CompanySettings } from "@/components/settings/company-form";
import { UserManager } from "@/components/settings/user-manager";
import { PasswordResetRequests } from "@/components/settings/password-reset-requests";
import { RolePermissions } from "@/components/settings/role-permissions";
import { PERMISSIONS, ALL_PERMISSIONS, parsePermissions } from "@/lib/permissions";
import { COMPANY } from "@/lib/constants";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

const TABS = [
  { key: "company", label: "Company", icon: Building2 },
  { key: "users", label: "Users", icon: Users },
  { key: "roles", label: "Roles & permissions", icon: ShieldCheck },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("settings.manage");
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === one(sp.tab)) ? one(sp.tab) : "company";

  const [settingRows, users, roles, resetRequests] = await Promise.all([
    prisma.setting.findMany(),
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { role: true, staff: { select: { fullName: true } } },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true } } } }),
    prisma.passwordResetRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const map = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));
  const initial: CompanySettings = {
    company_name: map.company_name || COMPANY.name,
    company_address: map.company_address || COMPANY.address,
    company_phone: map.company_phone || COMPANY.phone,
    company_email: map.company_email || COMPANY.email,
    company_gst: map.company_gst || "",
    company_signatory: map.company_signatory || "Authorised Signatory",
    subsidy_disclaimer: map.subsidy_disclaimer || "",
    default_working_days: map.default_working_days || "26",
    overtime_rate: map.overtime_rate || "0",
    default_system_cost_per_kw: map.default_system_cost_per_kw || "55000",
    notify_email: map.notify_email || "",
    notify_whatsapp: map.notify_whatsapp || "",
  };

  const catalogue = ALL_PERMISSIONS.map((key) => ({ key, label: PERMISSIONS[key] }));

  return (
    <div>
      <PageHeader
        title="Settings & access control"
        subtitle="Company profile, user logins aur role permissions — sab yahan se manage karein."
        eyebrow="System"
      />

      <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-card">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={`/app/settings?tab=${t.key}`}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${active ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </Link>
          );
        })}
      </div>

      {tab === "company" ? (
        <Card>
          <CardHeader title="Company profile" subtitle="Invoices, reports, PDF slips aur public website par use hota hai" />
          <div className="p-5">
            <CompanyForm initial={initial} />
          </div>
        </Card>
      ) : null}

      {tab === "users" ? (
        <Card>
          <CardHeader
            title="User logins"
            subtitle={`${users.length} accounts · ${users.filter((u) => u.isActive).length} active`}
            action={<span className="text-[11px] text-slate-500">Staff logins staff module se link hote hain</span>}
          />
          <div className="p-4">
            <PasswordResetRequests
              requests={resetRequests.map((r) => ({
                id: r.id,
                email: r.email,
                userName: r.user?.name ?? null,
                createdAt: r.createdAt.toISOString(),
              }))}
            />
            <UserManager
              users={users.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                roleKey: u.role.key,
                roleName: u.role.name,
                isActive: u.isActive,
                mustChangePassword: u.mustChangePassword,
                lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
                createdAt: u.createdAt.toISOString(),
                staffName: u.staff?.fullName ?? null,
              }))}
              roles={roles.map((r) => ({ key: r.key, name: r.name }))}
              currentUserId={user.id}
              currentRoleKey={user.roleKey}
            />
          </div>
        </Card>
      ) : null}

      {tab === "roles" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {roles.map((role) => (
            <div key={role.id}>
              <RolePermissions
                role={{ id: role.id, key: role.key, name: role.name, description: role.description, isSystem: role.isSystem }}
                permissions={parsePermissions(role.permissions)}
                catalogue={catalogue}
              />
              <p className="mt-1 px-1 text-[10px] text-slate-400">{role._count.users} user(s) assigned</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
