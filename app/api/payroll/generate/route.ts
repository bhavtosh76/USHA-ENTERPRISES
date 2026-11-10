import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { payrollGenerateSchema } from "@/lib/validation";
import { staffScope } from "@/lib/access";
import { nextSlipNo } from "@/lib/ids";
import { computePayroll, attendanceSummary } from "@/lib/payroll";
import { monthRange } from "@/lib/utils";
import { notifyAdmins } from "@/lib/notify";

export const POST = withApi(async (request) => {
  const user = await requireApi("payroll.manage");
  const input = await parseBody(request, payrollGenerateSchema);
  const { start, end } = monthRange(input.month);

  const scope = await staffScope(user);
  const staff = await prisma.staff.findMany({
    where: {
      AND: [
        scope,
        input.staffId ? { id: input.staffId } : {},
        { status: { in: ["ACTIVE", "INACTIVE"] } },
      ],
    },
    orderBy: { fullName: "asc" },
  });
  if (!staff.length) throw new HttpError(422, "No staff found for payroll generation.");

  const settings = await prisma.setting.findUnique({ where: { key: "overtime_rate" } });
  const settingRate = Number(settings?.value || 0);
  const overtimeRate = input.overtimeRatePerHour || settingRate;

  const results: { staffId: string; name: string; net: number; skipped: boolean }[] = [];

  for (const s of staff) {
    const existing = await prisma.salary.findUnique({
      where: { staffId_month: { staffId: s.id, month: input.month } },
    });
    if (existing && existing.status !== "PENDING") {
      results.push({ staffId: s.id, name: s.fullName, net: existing.netSalary, skipped: true });
      continue;
    }

    const [records, revenueAgg] = await Promise.all([
      prisma.attendance.findMany({
        where: { staffId: s.id, date: { gte: start, lte: end } },
        select: { status: true, overtimeHours: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: "INCOME",
          date: { gte: start, lte: end },
          OR: [{ staffId: s.id }, { customer: { assignedStaffId: s.id } }],
        },
        _sum: { amount: true },
      }),
    ]);

    const { counts, overtimeHours } = attendanceSummary(records);
    const achieved = revenueAgg._sum.amount ?? 0;

    let incentive = 0;
    if (s.targetMonthly > 0 && s.incentiveRate > 0) {
      incentive = Math.round((s.incentiveRate / 100) * s.monthlySalary * Math.min(1, achieved / s.targetMonthly));
    }
    const commission = s.commissionRate > 0 ? Math.round((s.commissionRate / 100) * achieved) : 0;

    const computed = computePayroll({
      fixedSalary: s.monthlySalary,
      workingDays: input.workingDays,
      counts,
      overtimeHours,
      overtimeRatePerHour: overtimeRate,
      incentive,
      commission,
      advance: existing?.advance ?? 0,
      otherDeduction: existing?.otherDeduction ?? 0,
    });

    if (existing) {
      await prisma.salary.update({
        where: { id: existing.id },
        data: {
          fixedSalary: s.monthlySalary,
          workingDays: input.workingDays,
          presentDays: computed.presentDays,
          absentDays: computed.absentDays,
          paidLeave: computed.paidLeave,
          unpaidLeave: computed.unpaidLeave,
          overtimeHours,
          overtimeAmount: computed.overtimeAmount,
          incentive,
          commission,
          grossSalary: computed.grossSalary,
          netSalary: computed.netSalary,
        },
      });
    } else {
      await prisma.salary.create({
        data: {
          staffId: s.id,
          month: input.month,
          fixedSalary: s.monthlySalary,
          workingDays: input.workingDays,
          presentDays: computed.presentDays,
          absentDays: computed.absentDays,
          paidLeave: computed.paidLeave,
          unpaidLeave: computed.unpaidLeave,
          overtimeHours,
          overtimeAmount: computed.overtimeAmount,
          incentive,
          commission,
          advance: 0,
          otherDeduction: 0,
          grossSalary: computed.grossSalary,
          netSalary: computed.netSalary,
          status: "PENDING",
          slipNo: await nextSlipNo(input.month),
        },
      });
    }
    results.push({ staffId: s.id, name: s.fullName, net: computed.netSalary, skipped: false });
  }

  await auditRequest(user, request, "GENERATE", "Payroll", null, {
    month: input.month,
    workingDays: input.workingDays,
    staffCount: results.length,
    created: results.filter((r) => !r.skipped).length,
  });

  await notifyAdmins({
    title: "Payroll generated",
    message: `${results.filter((r) => !r.skipped).length} salary slips generated for ${input.month}. Review and approve.`,
    type: "INFO",
    link: "/app/payroll",
  });

  return json({
    ok: true,
    month: input.month,
    created: results.filter((r) => !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    totalNet: results.reduce((s, r) => s + r.net, 0),
  });
});
