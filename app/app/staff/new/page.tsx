import { requirePermission, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { StaffForm } from "@/components/staff/staff-form";
import { getOrgAccess } from "@/lib/org";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Staff" };

export default async function NewStaffPage() {
  const user = await requireUser();
  await requirePermission("staff.manage");

  const access = await getOrgAccess(user);

  const [roles, designations, departments, allStaff] = await Promise.all([
    prisma.role.findMany({
      where: {
        ...(user.roleKey === "SUPER_ADMIN" ? {} : { key: { not: "SUPER_ADMIN" } }),
        ...(access.all ? {} : { key: { in: ["FIELD_STAFF", "TEAM_LEADER"] } }),
      },
      orderBy: { name: "asc" },
      select: { key: true, name: true },
    }),
    prisma.designation.findMany({
      where: { isActive: true },
      orderBy: [{ level: "desc" }, { name: "asc" }],
      select: { name: true, level: true },
    }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { name: true } }),
    prisma.staff.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        designation: true,
        designationRef: { select: { level: true } },
      },
    }),
  ]);

  const managers = allStaff
    .filter((s) => access.all || access.ids?.has(s.id))
    .map((s) => ({
      id: s.id,
      fullName: s.fullName,
      designation: s.designation,
      level: s.designationRef?.level,
    }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Add staff member"
        subtitle="Employee profile + login account ek saath create hoga. Employee ID automatically generate hoti hai aur reporting manager ke neeche tree me place hoga."
        eyebrow="Human Resources"
      />
      <StaffForm
        roles={roles}
        managers={managers}
        designations={designations}
        departments={departments.map((d) => d.name)}
      />
    </div>
  );
}
