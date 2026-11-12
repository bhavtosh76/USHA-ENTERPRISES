import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { staffTransferSchema } from "@/lib/validation";
import { getOrgAccess, isInSubtree, canonicalDesignation } from "@/lib/org";
import { can } from "@/lib/auth";

type Ctx = { params: Promise<Record<string, string>> };

/**
 * Transfer an employee to a different Reporting Manager (and optionally change
 * their designation). The whole subtree moves automatically because the tree is
 * derived from reportsToId.
 *
 * Guards:
 *  - actor must be allowed to manage this employee's subtree
 *  - employee cannot report to themselves
 *  - circular reporting is rejected
 *  - target manager must be inside the actor's scope
 *  - no self/cycle, and every change is written to EmployeeTransfer + audit log
 */
export const POST = withApi(async (request, context: Ctx) => {
  const actor = await requireApi("staff.transfer");
  const { id } = await context.params;
  const input = await parseBody(request, staffTransferSchema);

  const staff = await prisma.staff.findUnique({
    where: { id },
    include: { user: { include: { role: true } }, designationRef: true },
  });
  if (!staff) throw new HttpError(404, "Employee not found.");

  if (staff.user?.role.key === "SUPER_ADMIN" && actor.roleKey !== "SUPER_ADMIN") {
    throw new HttpError(403, "Super Admin reporting line can only be changed by the Super Admin.");
  }
  if (staff.userId === actor.id) {
    throw new HttpError(422, "Aap apni hi reporting manager change nahi kar sakte.");
  }

  const access = await getOrgAccess(actor);
  if (!access.all && !access.ids?.has(id)) {
    throw new HttpError(403, "This employee is outside your authorised team.");
  }

  const toManagerId = input.toManagerId || null;
  const rows = await prisma.staff.findMany({ select: { id: true, reportsToId: true } });

  if (toManagerId) {
    if (toManagerId === id) throw new HttpError(422, "An employee cannot report to themselves.");
    if (isInSubtree(rows, id, toManagerId)) {
      throw new HttpError(422, "Circular reporting is not allowed: manager cannot be inside the employee's own team.");
    }
    const manager = await prisma.staff.findUnique({
      where: { id: toManagerId },
      select: { id: true, fullName: true, status: true },
    });
    if (!manager) throw new HttpError(422, "Selected reporting manager not found.");
    if (manager.status !== "ACTIVE") throw new HttpError(422, "Selected reporting manager is not active.");
    if (!access.all && !access.ids?.has(toManagerId)) {
      throw new HttpError(403, "Selected manager is outside your authorised team.");
    }
  } else if (!access.all) {
    throw new HttpError(403, "Only company administrators can remove an employee's reporting manager.");
  }

  // Designation change is optional and also scope-checked.
  let nextDesignation = staff.designation;
  let nextDesignationId = staff.designationId;
  if (input.designation && input.designation !== canonicalDesignation(staff.designation)) {
    if (!can(actor, "staff.manage")) {
      throw new HttpError(403, "You are not allowed to change designations.");
    }
    const designation = await prisma.designation.findUnique({ where: { name: input.designation } });
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
        throw new HttpError(403, "Aap apne se senior ya barabar designation assign nahi kar sakte.");
      }
    }
    nextDesignation = designation.name;
    nextDesignationId = designation.id;
  }

  const changed = staff.reportsToId !== toManagerId || nextDesignation !== staff.designation;
  if (!changed) return json({ ok: true, staff: { id: staff.id }, changed: false });

  const effectiveDate = input.effectiveDate ? new Date(input.effectiveDate) : new Date();
  if (Number.isNaN(effectiveDate.getTime())) throw new HttpError(422, "Invalid effective date.");

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.staff.update({
      where: { id },
      data: { reportsToId: toManagerId, designation: nextDesignation, designationId: nextDesignationId },
    });
    await tx.employeeTransfer.create({
      data: {
        staffId: id,
        fromManagerId: staff.reportsToId,
        toManagerId,
        fromDesignation: staff.designation,
        toDesignation: nextDesignation,
        reason: input.reason || null,
        effectiveDate,
        transferredById: actor.id,
      },
    });
    return saved;
  });

  await auditRequest(actor, request, "TRANSFER", "Staff", id, {
    employeeId: staff.employeeId,
    fromManagerId: staff.reportsToId,
    toManagerId,
    fromDesignation: staff.designation,
    toDesignation: nextDesignation,
    reason: input.reason || null,
  });

  return json({ ok: true, changed: true, staff: { id: updated.id } });
});
