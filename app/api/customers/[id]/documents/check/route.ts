import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, HttpError } from "@/lib/api";
import { canAccessCustomer } from "@/lib/access";
import { documentCheckSchema } from "@/lib/validation";
import { compareIdentity } from "@/lib/verify";
import { logAudit } from "@/lib/audit";

export const POST = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("customer.view");
  const { id } = await context.params;
  if (!(await canAccessCustomer(user, id))) throw new HttpError(403, "Access denied.");

  const input = await parseBody(request, documentCheckSchema);
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new HttpError(404, "Customer not found.");

  const results = compareIdentity(
    {
      fullName: customer.fullName,
      fatherName: customer.fatherName,
      address: customer.address,
      village: customer.village,
    },
    {
      fullName: input.fullName,
      fatherName: input.fatherName,
      dob: input.dob,
      address: input.address,
      dobOnRecord: customer.dob ? customer.dob.toISOString().slice(0, 10) : null,
    },
  );

  const overall =
    results.every((r) => r.status === "MATCH" || r.status === "NOT_CHECKED")
      ? "MATCH"
      : results.some((r) => r.status === "MISMATCH")
        ? "MISMATCH"
        : "REVIEW";

  await logAudit({
    user,
    action: "DOC_CHECK",
    entity: "Customer",
    entityId: id,
    details: { overall, fields: results.map((r) => ({ field: r.field, score: r.score })) },
    headers: request.headers,
  });

  return json({
    ok: true,
    overall,
    results,
    note: "Manual cross-check — documents are not OCR-scanned. Staff must visually confirm the original document.",
  });
});
