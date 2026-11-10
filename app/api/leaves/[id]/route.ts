import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { leaveDecisionSchema } from "@/lib/validation";
import { notify } from "@/lib/notify";

export const PATCH = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("attendance.manage");
  const { id } = await context.params;
  const input = await parseBody(request, leaveDecisionSchema);

  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { staff: { include: { user: { select: { id: true } } } } },
  });
  if (!leave) throw new HttpError(404, "Leave request not found.");

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: input.status, approvedById: user.id, decidedAt: new Date() },
  });

  // Automation: approved leave pre-fills the attendance register for days
  // that have not been marked yet (never overwrites an existing entry).
  if (input.status === "APPROVED") {
    const status = leave.type === "UNPAID" ? "UNPAID_LEAVE" : "PAID_LEAVE";
    const cursor = new Date(leave.fromDate);
    while (cursor <= leave.toDate) {
      const day = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      await prisma.attendance.upsert({
        where: { staffId_date: { staffId: leave.staffId, date: day } },
        create: {
          staffId: leave.staffId,
          date: day,
          status,
          note: `Auto-marked from approved ${leave.type.toLowerCase()} leave.`,
          markedById: user.id,
        },
        update: {},
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  await auditRequest(user, request, input.status, "LeaveRequest", id, {
    staffId: leave.staffId,
    type: leave.type,
  });

  if (leave.staff.user?.id) {
    await notify({
      userId: leave.staff.user.id,
      title: `Leave ${input.status.toLowerCase()}`,
      message: `Aapki ${leave.type.toLowerCase()} leave request ${input.status.toLowerCase()} ho gayi.`,
      type: input.status === "APPROVED" ? "SUCCESS" : "WARNING",
      link: "/app/profile",
    });
  }

  return json({ ok: true, status: updated.status });
});
