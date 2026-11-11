import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { subsidyCalcSchema } from "@/lib/validation";
import { computeSubsidy, filterSchemesForState } from "@/lib/subsidy";
import { canAccessCustomer } from "@/lib/access";

export const POST = withApi(async (request) => {
  const user = await requireApi("subsidy.view");
  const input = await parseBody(request, subsidyCalcSchema);

  if (input.customerId && !(await canAccessCustomer(user, input.customerId))) {
    throw new HttpError(404, "Customer not found or not accessible.");
  }

  const now = new Date();
  const schemes = await prisma.subsidyScheme.findMany({
    where: {
      isActive: true,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
  });
  const applicable = filterSchemesForState(schemes, input.state, input.discom);
  const result = computeSubsidy(applicable, input.capacityKw);

  const settings = await prisma.setting.findMany({
    where: { key: { in: ["default_system_cost_per_kw", "subsidy_disclaimer"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const costPerKw =
    input.systemCostPerKw && input.systemCostPerKw > 0
      ? input.systemCostPerKw
      : Number(map.default_system_cost_per_kw || 70000);

  let customerSystemCost: number | null = null;
  if (input.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { systemCost: true },
    });
    customerSystemCost = customer?.systemCost || null;
  }

  const systemCost =
    input.systemCostPerKw && input.systemCostPerKw > 0
      ? Math.round(result.capacityKw * input.systemCostPerKw)
      : customerSystemCost && customerSystemCost > 0
        ? Math.round(customerSystemCost)
        : Math.round(result.capacityKw * costPerKw);
  const customerContribution = Math.max(0, systemCost - result.totalSubsidy);

  let savedId: string | null = null;
  if (input.customerId) {
    const saved = await prisma.subsidyCalculation.create({
      data: {
        customerId: input.customerId,
        schemeId: result.breakdown[0]?.schemeId ?? null,
        capacityKw: result.capacityKw,
        state: input.state,
        centralSubsidy: result.centralSubsidy,
        stateSubsidy: result.stateSubsidy,
        totalSubsidy: result.totalSubsidy,
        systemCost,
        customerContribution,
        schemeSnapshot: JSON.stringify(result.breakdown),
        createdById: user.id,
      },
    });
    savedId = saved.id;
    await auditRequest(user, request, "CALCULATE", "SubsidyCalculation", saved.id, {
      customerId: input.customerId,
      capacityKw: result.capacityKw,
      totalSubsidy: result.totalSubsidy,
    });
  }

  return json({
    ...result,
    systemCost,
    costPerKw: Math.round(systemCost / Math.max(result.capacityKw, 0.01)),
    customerContribution,
    state: input.state,
    discom: input.discom || null,
    disclaimer:
      map.subsidy_disclaimer ||
      "Yeh estimate hai. Actual subsidy eligibility aur Government approval par depend karti hai.",
    savedId,
    calculatedAt: new Date().toISOString(),
  });
});
