import { notFound } from "next/navigation";
import { requirePermission, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { StaffForm } from "@/components/staff/staff-form";
import { toInputDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Staff" };

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  await requirePermission("staff.manage");
  const { id } = await params;

  const [staff, roles, managers] = await Promise.all([
    prisma.staff.findUnique({ where: { id }, include: { user: { include: { role: true } } } }),
    prisma.role.findMany({
      where: user.roleKey === "SUPER_ADMIN" ? {} : { key: { not: "SUPER_ADMIN" } },
      orderBy: { name: "asc" },
      select: { key: true, name: true },
    }),
    prisma.staff.findMany({
      where: { status: "ACTIVE", id: { not: id } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, designation: true },
    }),
  ]);

  if (!staff) notFound();
  if (staff.user?.role.key === "SUPER_ADMIN" && user.roleKey !== "SUPER_ADMIN") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Edit — ${staff.fullName}`}
        subtitle={`${staff.employeeId} · Password blank chhodne par current password unchanged rahega.`}
        eyebrow="Human Resources"
      />
      <StaffForm
        mode="edit"
        staffId={staff.id}
        roles={roles}
        managers={managers}
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
