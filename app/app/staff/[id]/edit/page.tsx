import { notFound } from "next/navigation";
import { requirePermission, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { StaffForm } from "@/components/staff/staff-form";
import { toInputDate } from "@/lib/utils";
import { collectDescendantIds, getOrgAccess } from "@/lib/org";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Staff" };

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  await requirePermission("staff.manage");
  const { id } = await params;

  const access = await getOrgAccess(user);
  if (!access.all && !access.ids?.has(id)) notFound();

  const [staff, roles, designations, departments, allStaff, hierarchy] = await Promise.all([
    prisma.staff.findUnique({ where: { id }, include: { user: { include: { role: true } } } }),
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
    prisma.staff.findMany({ select: { id: true, reportsToId: true } }),
  ]);

  if (!staff) notFound();
  if (staff.user?.role.key === "SUPER_ADMIN" && user.roleKey !== "SUPER_ADMIN") {
    notFound();
  }

  // Never offer the employee's own subtree as a reporting manager (cycle).
  const blocked = collectDescendantIds(hierarchy, id);
  const managers = allStaff
    .filter((s) => !blocked.has(s.id))
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
        title={`Edit — ${staff.fullName}`}
        subtitle={`${staff.employeeId} · Password blank chhodne par current password unchanged rahega. Reporting change transfer history me record hoti hai.`}
        eyebrow="Human Resources"
      />
      <StaffForm
        mode="edit"
        staffId={staff.id}
        roles={roles}
        managers={managers}
        designations={designations}
        departments={departments.map((d) => d.name)}
        initial={{
          fullName: staff.fullName,
          mobile: staff.mobile,
          altMobile: staff.altMobile || "",
          email: staff.email || staff.user?.email || "",
          address: staff.address || "",
          joiningDate: toInputDate(staff.joiningDate),
          designation: staff.designation,
          department: staff.department || "",
          monthlySalary: String(staff.monthlySalary),
          bankName: staff.bankName || "",
          bankAccount: staff.bankAccount || "",
          bankIfsc: staff.bankIfsc || "",
          targetMonthly: String(staff.targetMonthly),
          incentiveRate: String(staff.incentiveRate),
          commissionRate: String(staff.commissionRate),
          area: staff.area || "",
          reportsToId: staff.reportsToId || "",
          status: staff.status,
          notes: staff.notes || "",
          roleKey: staff.user?.role.key || "FIELD_STAFF",
          password: "",
        }}
      />
    </div>
  );
}
