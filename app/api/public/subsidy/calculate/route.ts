import { prisma } from "@/lib/db";
import { computeSubsidy, filterSchemesForState } from "@/lib/subsidy";
import { subsidyCalcSchema } from "@/lib/validation";
import { json, parseBody, withApi } from "@/lib/api";
import { getCompany } from "@/lib/company";

export const POST = withApi(async (request) => {
  const input = await parseBody(request, subsidyCalcSchema);

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

  const [settings, company] = await Promise.all([
    prisma.setting.findMany({
      where: { key: { in: ["default_system_cost_per_kw", "subsidy_disclaimer"] } },
    }),
    getCompany(),
  ]);
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const costPerKw =
    input.systemCostPerKw && input.systemCostPerKw > 0
      ? input.systemCostPerKw
      : Number(map.default_system_cost_per_kw || 70000);

  const systemCost = Math.round(result.capacityKw * costPerKw);
  const customerContribution = Math.max(0, systemCost - result.totalSubsidy);

  return json({
    ...result,
    systemCost,
    costPerKw,
    customerContribution,
    state: input.state,
    discom: input.discom || null,
    disclaimer:
      map.subsidy_disclaimer ||
      "Yeh estimate hai. Actual subsidy eligibility aur Government approval par depend karti hai.",
    company: { name: company.name, phone: company.phone, email: company.email },
    calculatedAt: new Date().toISOString(),
  });
});
