import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { StaffForm } from "@/components/staff/staff-form";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Staff" };

export default async function NewStaffPage() {
  const user = await requireUser();
  await requirePermission("staff.manage");

  const [roles, managers] = await Promise.all([
    prisma.role.findMany({
      where: user.roleKey === "SUPER_ADMIN" ? {} : { key: { not: "SUPER_ADMIN" } },
      orderBy: { name: "asc" },
      select: { key: true, name: true },
    }),
    prisma.staff.findMany({
      where: {
        status: "ACTIVE",
        designation: { in: ["R Manager", "AREA Manager", "Team Leader"] },
      },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, designation: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Add staff member"
        subtitle="Employee profile + login account ek saath create hoga. Employee ID automatically generate hoti hai."
        eyebrow="Human Resources"
      />
      <StaffForm roles={roles} managers={managers} />
    </div>
  );
}
