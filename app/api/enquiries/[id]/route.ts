import { prisma } from "@/lib/db";
import { requireApi, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "CLOSED"]),
  note: z.string().trim().max(300).optional(),
});

export const PATCH = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("customer.edit");
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(422, "Invalid enquiry status.");

  const existing = await prisma.enquiry.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Enquiry not found.");

  const updated = await prisma.enquiry.update({
    where: { id },
    data: { status: parsed.data.status, handledById: user.id },
  });

  await auditRequest(user, request, "UPDATE", "Enquiry", id, {
    from: existing.status,
    to: updated.status,
    note: parsed.data.note,
  });

  return json({ ok: true, status: updated.status });
});
