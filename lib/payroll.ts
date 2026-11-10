import { ATTENDANCE_LABELS } from "./constants";

export type AttendanceCounts = Record<string, number>;

export type PayrollInput = {
  fixedSalary: number;
  workingDays: number;
  counts: AttendanceCounts;
  overtimeHours: number;
  overtimeRatePerHour: number;
  incentive: number;
  commission: number;
  advance: number;
  otherDeduction: number;
};

export type PayrollResult = {
  presentDays: number;
  absentDays: number;
  paidLeave: number;
  unpaidLeave: number;
  halfDays: number;
  payableDays: number;
  perDayRate: number;
  earnedBasic: number;
  overtimeAmount: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
};

/**
 * Deterministic, attendance-driven payroll formula.
 *   perDay      = fixed / workingDays
 *   payableDays = present + half*0.5 + paidLeave + holiday
 *   earnedBasic = min(fixed, perDay * payableDays)
 *   net         = earnedBasic + overtime + incentive + commission
 *                 - advance - otherDeduction
 */
export function computePayroll(input: PayrollInput): PayrollResult {
  const fixed = Math.max(0, input.fixedSalary);
  const workingDays = Math.max(1, input.workingDays);
  const present = input.counts.PRESENT || 0;
  const half = input.counts.HALF_DAY || 0;
  const paidLeave = input.counts.PAID_LEAVE || 0;
  const unpaid = input.counts.UNPAID_LEAVE || 0;
  const absent = input.counts.ABSENT || 0;
  const holiday = input.counts.HOLIDAY || 0;

  const payableDays = present + half * 0.5 + paidLeave + holiday;
  const perDay = fixed / workingDays;
  const earnedBasic = Math.min(fixed, Math.round(perDay * payableDays * 100) / 100);
  const overtimeAmount = Math.round(input.overtimeHours * input.overtimeRatePerHour);
  const gross = earnedBasic + overtimeAmount + input.incentive + input.commission;
  const deductions = input.advance + input.otherDeduction;

  return {
    presentDays: present + half * 0.5,
    absentDays: absent,
    paidLeave,
    unpaidLeave: unpaid,
    halfDays: half,
    payableDays,
    perDayRate: Math.round(perDay * 100) / 100,
    earnedBasic,
    overtimeAmount,
    grossSalary: Math.round(gross),
    deductions,
    netSalary: Math.max(0, Math.round(gross - deductions)),
  };
}

export function attendanceSummary(
  records: { status: string; overtimeHours: number }[],
): { counts: AttendanceCounts; overtimeHours: number } {
  const counts: AttendanceCounts = {};
  let overtimeHours = 0;
  for (const r of records) {
    counts[r.status] = (counts[r.status] || 0) + 1;
    overtimeHours += r.overtimeHours || 0;
  }
  return { counts, overtimeHours };
}

export function attendanceBreakdown(counts: AttendanceCounts): string {
  return Object.entries(counts)
    .map(([k, v]) => `${ATTENDANCE_LABELS[k] || k}: ${v}`)
    .join(", ");
}
