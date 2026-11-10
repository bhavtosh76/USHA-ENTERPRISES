import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { schemeSchema } from "@/lib/validation";

export const PATCH = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("subsidy.manage");
  const { id } = await context.params;
  const input = await parseBody(request, schemeSchema);

  const existing = await prisma.subsidyScheme.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Scheme not found.");
  if (input.capacityMaxKw <= input.capacityMinKw) {
    throw new HttpError(422, "Maximum capacity minimum capacity se bada hona chahiye.");
  }
  if (input.schemeCode !== existing.schemeCode) {
    const duplicate = await prisma.subsidyScheme.findUnique({ where: { schemeCode: input.schemeCode } });
    if (duplicate) throw new HttpError(409, "This scheme code already exists.");
  }

  const updated = await prisma.subsidyScheme.update({
    where: { id },
    data: {
      name: input.name,
      schemeCode: input.schemeCode,
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      state: input.state,
      discom: input.discom,
      capacityMinKw: input.capacityMinKw,
      capacityMaxKw: input.capacityMaxKw,
      centralRatePerKw: input.centralRatePerKw,
      stateRatePerKw: input.stateRatePerKw,
      maxSubsidy: input.maxSubsidy,
      eligibility: input.eligibility,
      sourceUrl: input.sourceUrl,
      notes: input.notes,
      isActive: input.isActive,
    },
  });

  await auditRequest(user, request, "UPDATE", "SubsidyScheme", id, {
    schemeCode: updated.schemeCode,
    state: updated.state,
    slab: `${updated.capacityMinKw}-${updated.capacityMaxKw} kW`,
  });

  return json({ ok: true, id });
});

export const DELETE = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("subsidy.manage");
  const { id } = await context.params;
  const existing = await prisma.subsidyScheme.findUnique({
    where: { id },
    include: { _count: { select: { calculations: true } } },
  });
  if (!existing) throw new HttpError(404, "Scheme not found.");

  if (existing._count.calculations > 0) {
    await prisma.subsidyScheme.update({ where: { id }, data: { isActive: false } });
    await auditRequest(user, request, "DEACTIVATE", "SubsidyScheme", id, {
      reason: "Used by saved calculations; kept for audit history.",
    });
    return json({ ok: true, deactivated: true });
  }

  await prisma.subsidyScheme.delete({ where: { id } });
  await auditRequest(user, request, "DELETE", "SubsidyScheme", id, { schemeCode: existing.schemeCode });
  return json({ ok: true, deactivated: false });
});
