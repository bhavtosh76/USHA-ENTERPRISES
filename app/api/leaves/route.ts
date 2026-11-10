import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { leaveSchema } from "@/lib/validation";
import { staffScope } from "@/lib/access";
import { can } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notify";

export const POST = withApi(async (request) => {
  const user = await requireApi("attendance.view");
  const input = await parseBody(request, leaveSchema);

  if (!can(user, "attendance.manage") && input.staffId !== user.staffId) {
    throw new HttpError(403, "Aap sirf apni leave request bhej sakte hain.");
  }
  if (can(user, "attendance.manage")) {
    const scope = await staffScope(user);
    const allowed = await prisma.staff.findFirst({ where: { AND: [{ id: input.staffId }, scope] }, select: { id: true } });
    if (!allowed) throw new HttpError(403, "Access denied for this staff member.");
  }

  const from = new Date(input.fromDate);
  const to = new Date(input.toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    throw new HttpError(422, "Leave dates valid nahi hain.");
  }

  const staff = await prisma.staff.findUnique({ where: { id: input.staffId }, select: { fullName: true, employeeId: true } });
  if (!staff) throw new HttpError(404, "Staff not found.");

  const leave = await prisma.leaveRequest.create({
    data: {
      staffId: input.staffId,
      fromDate: from,
      toDate: to,
      type: input.type,
      reason: input.reason,
      status: can(user, "attendance.manage") ? "APPROVED" : "PENDING",
      approvedById: can(user, "attendance.manage") ? user.id : null,
      decidedAt: can(user, "attendance.manage") ? new Date() : null,
    },
  });

  await auditRequest(user, request, "CREATE", "LeaveRequest", leave.id, {
    staffId: input.staffId,
    from: input.fromDate,
    to: input.toDate,
    type: input.type,
  });

  await notifyAdmins({
    title: "Leave request",
    message: `${staff.fullName} (${staff.employeeId}) requested ${input.type.toLowerCase()} leave from ${input.fromDate} to ${input.toDate}.`,
    type: "INFO",
    link: "/app/attendance",
  });

  return json({ ok: true, leave: { id: leave.id, status: leave.status } }, 201);
});
