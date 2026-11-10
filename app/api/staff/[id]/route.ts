import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { staffUpdateSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import { deleteStored } from "@/lib/storage";

type Ctx = { params: Promise<Record<string, string>> };

export const PATCH = withApi(async (request, context: Ctx) => {
  const actor = await requireApi("staff.manage");
  const { id } = await context.params;

  const staff = await prisma.staff.findUnique({ where: { id }, include: { user: { include: { role: true } } } });
  if (!staff) throw new HttpError(404, "Staff not found.");

  if (staff.user?.role.key === "SUPER_ADMIN" && actor.roleKey !== "SUPER_ADMIN") {
    throw new HttpError(403, "Super Admin account can only be modified by the Super Admin.");
  }

  const input = await parseBody(request, staffUpdateSchema);

  if (staff.userId === actor.id && input.status && input.status !== "ACTIVE") {
    throw new HttpError(422, "Aap apna hi account disable nahi kar sakte.");
  }

  let roleId: string | undefined;
  if (input.roleKey && input.roleKey !== staff.user?.role.key) {
    if (input.roleKey === "SUPER_ADMIN" && actor.roleKey !== "SUPER_ADMIN") {
      throw new HttpError(403, "Only the Super Admin can grant Super Admin role.");
    }
    const role = await prisma.role.findUnique({ where: { key: input.roleKey } });
    if (!role) throw new HttpError(422, "Invalid role.");
    roleId = role.id;
  }

  // Never allow the last active Super Admin to be demoted or disabled.
  const willLoseSuperAdmin =
    staff.user?.role.key === "SUPER_ADMIN" &&
    ((input.roleKey && input.roleKey !== "SUPER_ADMIN") ||
      (input.status && input.status !== "ACTIVE"));
  if (willLoseSuperAdmin) {
    const count = await prisma.user.count({
      where: { role: { key: "SUPER_ADMIN" }, isActive: true, id: { not: staff.userId ?? "" } },
    });
    if (count === 0) throw new HttpError(422, "At least one active Super Admin must remain.");
  }

  if (input.email && staff.userId) {
    const clash = await prisma.user.findFirst({
      where: { email: input.email, id: { not: staff.userId } },
      select: { id: true },
    });
    if (clash) throw new HttpError(409, "This email is already used by another user.");
  }

  const updated = await prisma.staff.update({
    where: { id },
    data: {
      fullName: input.fullName,
      mobile: input.mobile,
      altMobile: input.altMobile,
      email: input.email,
      address: input.address,
      joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
      designation: input.designation,
      department: input.department,
      monthlySalary: input.monthlySalary,
      bankName: input.bankName,
      bankAccount: input.bankAccount,
      bankIfsc: input.bankIfsc,
      targetMonthly: input.targetMonthly,
      incentiveRate: input.incentiveRate,
      commissionRate: input.commissionRate,
      area: input.area,
      reportsToId: input.reportsToId,
      status: input.status,
      notes: input.notes,
    },
  });

  if (staff.userId) {
    await prisma.user.update({
      where: { id: staff.userId },
      data: {
        name: input.fullName,
        email: input.email || undefined,
        roleId,
        isActive: input.status ? input.status === "ACTIVE" : undefined,
        ...(input.password ? { passwordHash: await hashPassword(input.password), mustChangePassword: true } : {}),
      },
    });
  }

  await auditRequest(actor, request, "UPDATE", "Staff", id, {
    employeeId: staff.employeeId,
    fields: Object.keys(input),
    passwordReset: Boolean(input.password),
    roleChanged: Boolean(roleId),
  });

  return json({ ok: true, staff: { id: updated.id } });
});

export const DELETE = withApi(async (request, context: Ctx) => {
  const actor = await requireApi("staff.manage");
  const { id } = await context.params;

  const staff = await prisma.staff.findUnique({
    where: { id },
    include: { user: { include: { role: true } }, _count: { select: { customers: true, salaries: true, attendance: true, transactions: true } } },
  });
  if (!staff) throw new HttpError(404, "Staff not found.");
  if (staff.userId === actor.id) throw new HttpError(422, "Aap apna hi account delete nahi kar sakte.");
  if (staff.user?.role.key === "SUPER_ADMIN") throw new HttpError(403, "Super Admin account cannot be deleted.");

  const linked =
    staff._count.customers + staff._count.salaries + staff._count.attendance + staff._count.transactions;

  if (linked > 0) {
    await prisma.staff.update({ where: { id }, data: { status: "INACTIVE" } });
    if (staff.userId) {
      await prisma.user.update({ where: { id: staff.userId }, data: { isActive: false } });
    }
    await auditRequest(actor, request, "DEACTIVATE", "Staff", id, {
      employeeId: staff.employeeId,
      reason: "Linked records exist — soft deactivated to preserve history",
      linked,
    });
    return json({ ok: true, deactivated: true, message: "Linked records exist, so the account was deactivated instead of deleted." });
  }

  if (staff.photoPath) await deleteStored(staff.photoPath);
  if (staff.userId) await prisma.user.delete({ where: { id: staff.userId } });
  await prisma.staff.delete({ where: { id } });
  await auditRequest(actor, request, "DELETE", "Staff", id, { employeeId: staff.employeeId });
  return json({ ok: true, deactivated: false });
});
