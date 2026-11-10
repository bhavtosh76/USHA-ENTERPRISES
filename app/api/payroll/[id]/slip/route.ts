import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApi, withApi, HttpError } from "@/lib/api";
import { can } from "@/lib/auth";
import { buildSalarySlipPdf } from "@/lib/pdf";
import { monthLabel } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

export const GET = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi();
  const { id } = await context.params;

  const salary = await prisma.salary.findUnique({
    where: { id },
    include: { staff: true },
  });
  if (!salary) throw new HttpError(404, "Salary slip not found.");

  const isOwn = user.staffId === salary.staffId;
  if (!can(user, "payroll.view") && !isOwn) throw new HttpError(403, "Access denied.");
  if (isOwn && !can(user, "payroll.view") && salary.status === "PENDING") {
    throw new HttpError(403, "Slip is available after approval.");
  }

  const settings = await prisma.setting.findMany({
    where: { key: { in: ["company_name", "company_address"] } },
  });
  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const pdf = await buildSalarySlipPdf({
    slipNo: salary.slipNo,
    monthLabel: monthLabel(salary.month),
    company: {
      name: settingMap.company_name || "USHA ENTERPRISES",
      address: settingMap.company_address || "",
    },
    staff: {
      fullName: salary.staff.fullName,
      employeeId: salary.staff.employeeId,
      designation: salary.staff.designation,
      department: salary.staff.department,
      mobile: salary.staff.mobile,
      bankName: salary.staff.bankName,
      bankAccount: salary.staff.bankAccount,
      joiningDate: salary.staff.joiningDate,
    },
    salary: {
      fixedSalary: salary.fixedSalary,
      workingDays: salary.workingDays,
      presentDays: salary.presentDays,
      absentDays: salary.absentDays,
      paidLeave: salary.paidLeave,
      unpaidLeave: salary.unpaidLeave,
      overtimeHours: salary.overtimeHours,
      overtimeAmount: salary.overtimeAmount,
      incentive: salary.incentive,
      commission: salary.commission,
      advance: salary.advance,
      otherDeduction: salary.otherDeduction,
      grossSalary: salary.grossSalary,
      netSalary: salary.netSalary,
      status: salary.status,
      paidAt: salary.paidAt,
      paymentMode: salary.paymentMode,
    },
  });

  await logAudit({
    user,
    action: "DOWNLOAD",
    entity: "SalarySlip",
    entityId: id,
    details: { slipNo: salary.slipNo, staff: salary.staff.employeeId },
    headers: request.headers,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${salary.slipNo}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
