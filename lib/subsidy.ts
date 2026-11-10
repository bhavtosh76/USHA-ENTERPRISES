import type { SubsidyScheme } from "@prisma/client";

export type SubsidySchemeLike = Pick<
  SubsidyScheme,
  | "id"
  | "name"
  | "schemeCode"
  | "capacityMinKw"
  | "capacityMaxKw"
  | "centralRatePerKw"
  | "stateRatePerKw"
  | "maxSubsidy"
  | "state"
  | "discom"
  | "notes"
  | "sourceUrl"
>;

export type SubsidyBreakdownRow = {
  schemeId: string;
  schemeCode: string;
  name: string;
  capacityInSlab: number;
  centralRatePerKw: number;
  stateRatePerKw: number;
  centralAmount: number;
  stateAmount: number;
  capped: boolean;
  notes?: string | null;
  sourceUrl?: string | null;
};

export type SubsidyResult = {
  capacityKw: number;
  centralSubsidy: number;
  stateSubsidy: number;
  totalSubsidy: number;
  breakdown: SubsidyBreakdownRow[];
  appliedCount: number;
};

/**
 * Pure, side-effect free subsidy engine.
 * Rules come exclusively from admin-managed scheme rows — never hardcoded.
 * Each scheme row contributes for the portion of capacity that overlaps its slab.
 */
export function computeSubsidy(
  schemes: SubsidySchemeLike[],
  capacityKw: number,
): SubsidyResult {
  const capacity = Math.max(0, Number(capacityKw) || 0);
  const breakdown: SubsidyBreakdownRow[] = [];
  let central = 0;
  let state = 0;

  const sorted = [...schemes].sort((a, b) => a.capacityMinKw - b.capacityMinKw);

  for (const scheme of sorted) {
    const overlap = Math.max(
      0,
      Math.min(capacity, scheme.capacityMaxKw) - scheme.capacityMinKw,
    );
    if (overlap <= 0) continue;

    let c = scheme.centralRatePerKw * overlap;
    let s = scheme.stateRatePerKw * overlap;
    let capped = false;

    if (scheme.maxSubsidy > 0) {
      const combined = c + s;
      if (combined > scheme.maxSubsidy) {
        const factor = scheme.maxSubsidy / combined;
        c = c * factor;
        s = s * factor;
        capped = true;
      }
    }

    c = Math.round(c);
    s = Math.round(s);
    central += c;
    state += s;

    breakdown.push({
      schemeId: scheme.id,
      schemeCode: scheme.schemeCode,
      name: scheme.name,
      capacityInSlab: Math.round(overlap * 100) / 100,
      centralRatePerKw: scheme.centralRatePerKw,
      stateRatePerKw: scheme.stateRatePerKw,
      centralAmount: c,
      stateAmount: s,
      capped,
      notes: scheme.notes,
      sourceUrl: scheme.sourceUrl,
    });
  }

  return {
    capacityKw: capacity,
    centralSubsidy: central,
    stateSubsidy: state,
    totalSubsidy: central + state,
    breakdown,
    appliedCount: breakdown.length,
  };
}

export function filterSchemesForState<T extends { state: string; discom: string | null }>(
  schemes: T[],
  stateName: string,
  discom?: string | null,
): T[] {
  return schemes.filter((s) => {
    const stateOk = s.state === "ALL" || s.state.toLowerCase() === stateName.toLowerCase();
    const discomOk = !s.discom || !discom || s.discom.toLowerCase() === discom.toLowerCase();
    return stateOk && discomOk;
  });
}
