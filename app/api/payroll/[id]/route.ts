import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { payrollDecisionSchema } from "@/lib/validation";
import { notify } from "@/lib/notify";
import { can } from "@/lib/auth";
import { monthLabel } from "@/lib/utils";

export const PATCH = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("payroll.view");
  const { id } = await context.params;
  const input = await parseBody(request, payrollDecisionSchema);

  const salary = await prisma.salary.findUnique({
    where: { id },
    include: { staff: { include: { user: { select: { id: true } } } } },
  });
  if (!salary) throw new HttpError(404, "Salary record not found.");

  // Staff may only view their own slip; only payroll approvers can mutate.
  if (!can(user, "payroll.approve") && !can(user, "payroll.manage")) {
    throw new HttpError(403, "Aap payroll update nahi kar sakte.");
  }

  if (input.action === "EDIT") {
    if (salary.status === "PAID") throw new HttpError(422, "Paid salary cannot be edited.");
    const incentive = input.incentive ?? salary.incentive;
    const commission = input.commission ?? salary.commission;
    const advance = input.advance ?? salary.advance;
    const other = input.otherDeduction ?? salary.otherDeduction;
    const gross = salary.grossSalary - salary.incentive - salary.commission + incentive + commission;
    const net = Math.max(0, Math.round(gross - advance - other));
    const updated = await prisma.salary.update({
      where: { id },
      data: {
        incentive,
        commission,
        advance,
        otherDeduction: other,
        grossSalary: Math.round(gross),
        netSalary: net,
        remarks: input.remarks ?? salary.remarks,
        status: "PENDING",
        approvedById: null,
        approvedAt: null,
      },
    });
    await auditRequest(user, request, "EDIT", "Salary", id, { advance, other, incentive, commission, net });
    return json({ ok: true, status: updated.status, netSalary: updated.netSalary });
  }

  if (input.action === "APPROVE") {
    if (salary.status === "PAID") throw new HttpError(422, "Salary already paid.");
    if (!can(user, "payroll.approve")) throw new HttpError(403, "Approval permission required.");
    const updated = await prisma.salary.update({
      where: { id },
      data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() },
    });
    if (salary.staff.user?.id) {
      await notify({
        userId: salary.staff.user.id,
        title: "Salary approved",
        message: `${monthLabel(salary.month)} ki salary approve ho gayi (${salary.netSalary}). Payment pending.`,
        type: "SUCCESS",
        link: "/app/profile",
      });
    }
    await auditRequest(user, request, "APPROVE", "Salary", id, { month: salary.month, net: salary.netSalary });
    return json({ ok: true, status: updated.status });
  }

  if (input.action === "PAY") {
    if (!can(user, "payroll.approve")) throw new HttpError(403, "Payment permission required.");
    if (salary.status === "PAID") throw new HttpError(422, "Salary already marked paid.");
    const mode = input.paymentMode || "BANK";
    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.salary.update({
        where: { id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentMode: mode,
          approvedById: salary.approvedById || user.id,
          approvedAt: salary.approvedAt || new Date(),
        },
      });
      await tx.salaryPayment.create({
        data: {
          salaryId: id,
          amount: salary.netSalary,
          mode,
          reference: input.reference || null,
          paidById: user.id,
        },
      });
      // Reflect salary payout in company finance exactly once.
      await tx.transaction.create({
        data: {
          type: "EXPENSE",
          category: "SALARY",
          amount: salary.netSalary,
          date: new Date(),
          description: `Salary ${monthLabel(salary.month)} — ${salary.staff.fullName} (${salary.slipNo})`,
          reference: input.reference || salary.slipNo,
          paymentMode: mode,
          staffId: salary.staffId,
          createdById: user.id,
        },
      });
      return s;
    });
    if (salary.staff.user?.id) {
      await notify({
        userId: salary.staff.user.id,
        title: "Salary paid",
        message: `${monthLabel(salary.month)} ki salary ${salary.netSalary} pay ho gayi (${mode}). Slip download kar sakte hain.`,
        type: "SUCCESS",
        link: "/app/profile",
      });
    }
    await auditRequest(user, request, "PAY", "Salary", id, { month: salary.month, net: salary.netSalary, mode });
    return json({ ok: true, status: updated.status });
  }

  // REOPEN
  if (salary.status === "PAID") throw new HttpError(422, "Paid salary cannot be reopened. Use an adjustment entry.");
  const updated = await prisma.salary.update({
    where: { id },
    data: { status: "PENDING", approvedById: null, approvedAt: null },
  });
  await auditRequest(user, request, "REOPEN", "Salary", id, { month: salary.month });
  return json({ ok: true, status: updated.status });
});
