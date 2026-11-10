import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { attendanceSchema } from "@/lib/validation";
import { staffScope } from "@/lib/access";
import { startOfDay } from "@/lib/utils";

export const POST = withApi(async (request) => {
  const user = await requireApi("attendance.manage");
  const input = await parseBody(request, attendanceSchema);

  const date = startOfDay(new Date(input.date));
  if (Number.isNaN(date.getTime())) throw new HttpError(422, "Invalid attendance date.");

  const scope = await staffScope(user);
  const allowed = await prisma.staff.findMany({
    where: { AND: [{ id: { in: input.entries.map((e) => e.staffId) } }, scope] },
    select: { id: true },
  });
  const allowedIds = new Set(allowed.map((s) => s.id));
  if (allowedIds.size !== new Set(input.entries.map((e) => e.staffId)).size) {
    throw new HttpError(403, "Aap kuch selected staff ki attendance mark nahi kar sakte.");
  }

  await prisma.$transaction(
    input.entries.map((entry) =>
      prisma.attendance.upsert({
        where: { staffId_date: { staffId: entry.staffId, date } },
        create: {
          staffId: entry.staffId,
          date,
          status: entry.status,
          checkIn: entry.checkIn || null,
          checkOut: entry.checkOut || null,
          overtimeHours: entry.overtimeHours,
          note: entry.note || null,
          markedById: user.id,
        },
        update: {
          status: entry.status,
          checkIn: entry.checkIn || null,
          checkOut: entry.checkOut || null,
          overtimeHours: entry.overtimeHours,
          note: entry.note || null,
          markedById: user.id,
        },
      }),
    ),
  );

  await auditRequest(user, request, "MARK", "Attendance", null, {
    date: input.date,
    count: input.entries.length,
    statuses: input.entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {}),
  });

  return json({ ok: true, count: input.entries.length });
});
