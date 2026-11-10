import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { schemeSchema } from "@/lib/validation";

export const POST = withApi(async (request) => {
  const user = await requireApi("subsidy.manage");
  const input = await parseBody(request, schemeSchema);

  if (input.capacityMaxKw <= input.capacityMinKw) {
    throw new HttpError(422, "Maximum capacity minimum capacity se bada hona chahiye.");
  }
  const duplicate = await prisma.subsidyScheme.findUnique({ where: { schemeCode: input.schemeCode } });
  if (duplicate) throw new HttpError(409, "This scheme code already exists.");

  const scheme = await prisma.subsidyScheme.create({
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

  await auditRequest(user, request, "CREATE", "SubsidyScheme", scheme.id, {
    schemeCode: scheme.schemeCode,
    state: scheme.state,
    slab: `${scheme.capacityMinKw}-${scheme.capacityMaxKw} kW`,
  });

  return json({ ok: true, id: scheme.id }, 201);
});
