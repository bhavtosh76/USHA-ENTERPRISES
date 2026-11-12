import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { staffUpdateSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import { deleteStored } from "@/lib/storage";
import { canonicalDesignation, getOrgAccess, isInSubtree, levelOf } from "@/lib/org";

type Ctx = { params: Promise<Record<string, string>> };

const MANAGER_ALLOWED_ROLES = ["FIELD_STAFF", "TEAM_LEADER"];

export const PATCH = withApi(async (request, context: Ctx) => {
  const actor = await requireApi("staff.manage");
  const { id } = await context.params;

  const staff = await prisma.staff.findUnique({
    where: { id },
    include: { user: { include: { role: true } }, designationRef: true },
  });
  if (!staff) throw new HttpError(404, "Staff not found.");

  if (staff.user?.role.key === "SUPER_ADMIN" && actor.roleKey !== "SUPER_ADMIN") {
    throw new HttpError(403, "Super Admin account can only be modified by the Super Admin.");
  }

  const access = await getOrgAccess(actor);
  if (!access.all && !access.ids?.has(id)) {
    throw new HttpError(403, "This employee is outside your authorised team.");
  }

  const input = await parseBody(request, staffUpdateSchema);

  if (staff.userId === actor.id && input.status && input.status !== "ACTIVE") {
    throw new HttpError(422, "Aap apna hi account disable nahi kar sakte.");
  }

  if (!access.all && input.roleKey && input.roleKey !== staff.user?.role.key) {
    if (!MANAGER_ALLOWED_ROLES.includes(input.roleKey)) {
      throw new HttpError(403, "You can only assign Team Leader or Field Staff roles.");
    }
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

  const nextManagerId =
    input.reportsToId === undefined ? staff.reportsToId : input.reportsToId || null;

  let nextDesignation = staff.designation;
  let nextDesignationId = staff.designationId;
  let nextDesignationLevel = staff.designationRef?.level ?? levelOf(staff.designation);
  if (input.designation && canonicalDesignation(input.designation) !== canonicalDesignation(staff.designation)) {
    const canonical = canonicalDesignation(input.designation);
    const designation = await prisma.designation.findUnique({ where: { name: canonical } });
    if (!designation || !designation.isActive) throw new HttpError(422, "Invalid designation.");
    if (!access.all) {
      const actorStaff = actor.staffId
        ? await prisma.staff.findUnique({
            where: { id: actor.staffId },
            select: { designationRef: { select: { level: true } } },
          })
        : null;
      const actorLevel = actorStaff?.designationRef?.level ?? 0;
      if (designation.level >= actorLevel) {
        throw new HttpError(403, "Aap apne se senior designation assign nahi kar sakte.");
      }
    }
    nextDesignation = designation.name;
    nextDesignationId = designation.id;
    nextDesignationLevel = designation.level;
  } else if (input.designation) {
    nextDesignation = canonicalDesignation(input.designation);
  }

  const designationLevelChanged =
    nextDesignationLevel !== (staff.designationRef?.level ?? levelOf(staff.designation));
  if (nextManagerId !== staff.reportsToId || (designationLevelChanged && nextManagerId)) {
    if (nextManagerId) {
      if (nextManagerId === id) throw new HttpError(422, "An employee cannot report to themselves.");
      const rows = await prisma.staff.findMany({ select: { id: true, reportsToId: true } });
      if (isInSubtree(rows, id, nextManagerId)) {
        throw new HttpError(422, "Circular reporting is not allowed: manager cannot be inside the employee's own team.");
      }
      const manager = await prisma.staff.findUnique({
        where: { id: nextManagerId },
        select: {
          id: true,
          status: true,
          designation: true,
          designationRef: { select: { name: true, level: true } },
        },
      });
      if (!manager) throw new HttpError(422, "Reporting manager not found.");
      if (manager.status !== "ACTIVE") throw new HttpError(422, "Reporting manager is not active.");
      if (!access.all && !access.ids?.has(nextManagerId)) {
        throw new HttpError(403, "Selected manager is outside your authorised team.");
      }
      const managerLevel = levelOf(
        manager.designationRef?.name ?? manager.designation,
        manager.designationRef?.level,
      );
      if (managerLevel <= nextDesignationLevel) {
        throw new HttpError(422, "Reporting manager ka designation employee se senior hona chahiye.");
      }
    } else if (!access.all) {
      throw new HttpError(403, "Only company administrators can remove an employee's reporting manager.");
    }
  }

  const department = input.department
    ? await prisma.department.findUnique({ where: { name: input.department } })
    : null;

  const managerChanged = nextManagerId !== staff.reportsToId;
  const designationChanged = nextDesignation !== staff.designation;
  const statusChanged = Boolean(input.status && input.status !== staff.status);

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.staff.update({
      where: { id },
      data: {
        fullName: input.fullName,
        mobile: input.mobile,
        altMobile: input.altMobile,
        email: input.email,
        address: input.address,
        joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
        dateOfBirth:
          input.dateOfBirth === undefined
            ? undefined
            : input.dateOfBirth
              ? new Date(input.dateOfBirth)
              : null,
        gender: input.gender,
        employmentType: input.employmentType,
        designation: nextDesignation,
        designationId: nextDesignationId,
        department: input.department,
        departmentId: department?.id ?? (input.department === "" ? null : undefined),
        monthlySalary: input.monthlySalary,
        bankName: input.bankName,
        bankAccount: input.bankAccount,
        bankIfsc: input.bankIfsc,
        targetMonthly: input.targetMonthly,
        incentiveRate: input.incentiveRate,
        commissionRate: input.commissionRate,
        area: input.area,
        reportsToId: nextManagerId,
        status: input.status,
        notes: input.notes,
      },
    });

    if (managerChanged || designationChanged) {
      await tx.employeeTransfer.create({
        data: {
          staffId: id,
          fromManagerId: staff.reportsToId,
          toManagerId: nextManagerId,
          fromDesignation: staff.designation,
          toDesignation: nextDesignation,
          reason: "Updated from staff profile.",
          transferredById: actor.id,
        },
      });
    }
    if (statusChanged && input.status) {
      await tx.employeeStatusHistory.create({
        data: {
          staffId: id,
          fromStatus: staff.status,
          toStatus: input.status,
          changedById: actor.id,
        },
      });
    }
    return saved;
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
    managerChanged,
    designationChanged,
    statusChanged,
  });

  return json({ ok: true, staff: { id: updated.id } });
});

export const DELETE = withApi(async (request, context: Ctx) => {
  const actor = await requireApi("staff.manage");
  const { id } = await context.params;

  const staff = await prisma.staff.findUnique({
    where: { id },
    include: {
      user: { include: { role: true } },
      _count: { select: { customers: true, salaries: true, attendance: true, transactions: true, subordinates: true } },
    },
  });
  if (!staff) throw new HttpError(404, "Staff not found.");
  if (staff.userId === actor.id) throw new HttpError(422, "Aap apna hi account delete nahi kar sakte.");
  if (staff.user?.role.key === "SUPER_ADMIN") throw new HttpError(403, "Super Admin account cannot be deleted.");

  const access = await getOrgAccess(actor);
  if (!access.all && !access.ids?.has(id)) {
    throw new HttpError(403, "This employee is outside your authorised team.");
  }
  if (!access.all && staff._count.subordinates > 0) {
    throw new HttpError(422, "Reassign this employee's team before deleting the account.");
  }

  const linked =
    staff._count.customers + staff._count.salaries + staff._count.attendance + staff._count.transactions;

  if (linked > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.staff.update({ where: { id }, data: { status: "INACTIVE" } });
      if (staff.userId) {
        await tx.user.update({ where: { id: staff.userId }, data: { isActive: false } });
      }
      await tx.employeeStatusHistory.create({
        data: {
          staffId: id,
          fromStatus: staff.status,
          toStatus: "INACTIVE",
          reason: "Linked records exist - soft deactivated to preserve history",
          changedById: actor.id,
        },
      });
    });
    await auditRequest(actor, request, "DEACTIVATE", "Staff", id, {
      employeeId: staff.employeeId,
      reason: "Linked records exist - soft deactivated to preserve history",
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
