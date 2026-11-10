import { prisma } from "@/lib/db";
import { requireApi, withApi, HttpError } from "@/lib/api";
import { customerScope, staffScope } from "@/lib/access";
import { buildTablePdf, type PdfColumn } from "@/lib/pdf";
import { buildExcel } from "@/lib/excel";
import { ATTENDANCE_LABELS, CATEGORY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatINR, monthLabel, monthRange, toInputDate } from "@/lib/utils";
import { can } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Row = Record<string, string | number | null | undefined>;

type ReportResult = {
  title: string;
  sheetName: string;
  subtitle: string;
  columns: { header: string; key: string; weight: number; align?: "left" | "right" | "center"; width?: number }[];
  rows: Row[];
  summary: { label: string; value: string | number }[];
};

function rangeFromQuery(from: string | null, to: string | null) {
  const now = new Date();
  const start = from ? new Date(`${from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = to ? new Date(`${to}T23:59:59`) : now;
  return { start, end };
}

export const GET = withApi(async (request) => {
  const user = await requireApi("reports.view");
  const url = new URL(request.url);
  const report = url.searchParams.get("report") || "customers";
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "pdf";
  const staffId = url.searchParams.get("staffId") || "";
  const village = url.searchParams.get("village") || "";
  const status = url.searchParams.get("status") || "";
  const month = url.searchParams.get("month") || "";
  const { start, end } = rangeFromQuery(url.searchParams.get("from"), url.searchParams.get("to"));

  let result: ReportResult;

  if (report === "customers") {
    const scope = await customerScope(user);
    const rows = await prisma.customer.findMany({
      where: {
        AND: [
          scope,
          { isArchived: false },
          { applicationDate: { gte: start, lte: end } },
          ...(staffId ? [{ assignedStaffId: staffId }] : []),
          ...(village ? [{ village: { contains: village } }] : []),
          ...(status ? [{ status }] : []),
        ],
      },
      orderBy: { applicationDate: "desc" },
      include: { assignedStaff: { select: { fullName: true } } },
      take: 5000,
    });
    const totalCost = rows.reduce((s, r) => s + r.systemCost, 0);
    result = {
      title: "Customer report",
      sheetName: "Customers",
      subtitle: `${rows.length} customers · ${formatDate(start)} to ${formatDate(end)}`,
      columns: [
        { header: "Code", key: "code", weight: 1.4 },
        { header: "Customer", key: "name", weight: 2 },
        { header: "Mobile", key: "mobile", weight: 1.3 },
        { header: "Village", key: "village", weight: 1.2 },
        { header: "kW", key: "capacity", weight: 0.7, align: "right" },
        { header: "System cost", key: "cost", weight: 1.2, align: "right" },
        { header: "Status", key: "status", weight: 1.6 },
        { header: "Assigned", key: "assigned", weight: 1.5 },
        { header: "Applied", key: "applied", weight: 1.1 },
      ],
      rows: rows.map((r) => ({
        code: r.customerCode,
        name: r.fullName,
        mobile: r.mobile,
        village: r.village || "",
        capacity: r.capacityKw,
        cost: r.systemCost,
        status: STATUS_LABELS[r.status] || r.status,
        assigned: r.assignedStaff?.fullName || "Unassigned",
        applied: formatDate(r.applicationDate),
      })),
      summary: [
        { label: "Total customers", value: rows.length },
        { label: "Total system cost", value: formatINR(totalCost) },
      ],
    };
  } else if (report === "staff") {
    const scope = await staffScope(user);
    const rows = await prisma.staff.findMany({
      where: { AND: [scope, ...(status ? [{ status }] : [])] },
      orderBy: { fullName: "asc" },
      include: { user: { include: { role: true } }, reportsTo: { select: { fullName: true } } },
      take: 2000,
    });
    const salary = rows.filter((r) => r.status === "ACTIVE").reduce((s, r) => s + r.monthlySalary, 0);
    result = {
      title: "Staff directory",
      sheetName: "Staff",
      subtitle: `${rows.length} staff members`,
      columns: [
        { header: "Employee ID", key: "employeeId", weight: 1.2 },
        { header: "Name", key: "name", weight: 2 },
        { header: "Designation", key: "designation", weight: 1.5 },
        { header: "Role", key: "role", weight: 1.2 },
        { header: "Mobile", key: "mobile", weight: 1.3 },
        { header: "Area", key: "area", weight: 1.2 },
        { header: "Reports to", key: "reportsTo", weight: 1.5 },
        { header: "Salary", key: "salary", weight: 1.1, align: "right" },
        { header: "Status", key: "status", weight: 0.9 },
        { header: "Joined", key: "joined", weight: 1.1 },
      ],
      rows: rows.map((r) => ({
        employeeId: r.employeeId,
        name: r.fullName,
        designation: r.designation,
        role: r.user?.role.name || "No login",
        mobile: r.mobile,
        area: r.area || "",
        reportsTo: r.reportsTo?.fullName || "",
        salary: r.monthlySalary,
        status: r.status,
        joined: formatDate(r.joiningDate),
      })),
      summary: [
        { label: "Total staff", value: rows.length },
        { label: "Active monthly salary", value: formatINR(salary) },
      ],
    };
  } else if (report === "payroll") {
    const scope = await staffScope(user);
    const payrollMonth = /^\d{4}-\d{2}$/.test(month) ? month : toInputDate(new Date()).slice(0, 7);
    const rows = await prisma.salary.findMany({
      where: {
        AND: [{ staff: scope }, { month: payrollMonth }, ...(staffId ? [{ staffId }] : []), ...(status ? [{ status }] : [])],
      },
      orderBy: { staff: { fullName: "asc" } },
      include: { staff: { select: { fullName: true, employeeId: true } } },
      take: 2000,
    });
    const net = rows.reduce((s, r) => s + r.netSalary, 0);
    result = {
      title: "Payroll register",
      sheetName: "Payroll",
      subtitle: `${monthLabel(payrollMonth)} · ${rows.length} slips`,
      columns: [
        { header: "Slip no.", key: "slip", weight: 1.4 },
        { header: "Employee", key: "employee", weight: 2 },
        { header: "Employee ID", key: "employeeId", weight: 1.1 },
        { header: "Present", key: "present", weight: 0.8, align: "right" },
        { header: "Absent", key: "absent", weight: 0.8, align: "right" },
        { header: "Gross", key: "gross", weight: 1.1, align: "right" },
        { header: "Deduction", key: "deduction", weight: 1.1, align: "right" },
        { header: "Net", key: "net", weight: 1.1, align: "right" },
        { header: "Status", key: "status", weight: 0.9 },
        { header: "Paid on", key: "paid", weight: 1.1 },
      ],
      rows: rows.map((r) => ({
        slip: r.slipNo,
        employee: r.staff.fullName,
        employeeId: r.staff.employeeId,
        present: r.presentDays,
        absent: r.absentDays,
        gross: r.grossSalary,
        deduction: r.advance + r.otherDeduction,
        net: r.netSalary,
        status: r.status,
        paid: r.paidAt ? formatDate(r.paidAt) : "",
      })),
      summary: [
        { label: "Total net payable", value: formatINR(net) },
        { label: "Paid slips", value: rows.filter((r) => r.status === "PAID").length },
      ],
    };
  } else if (report === "finance") {
    const rows = await prisma.transaction.findMany({
      where: {
        AND: [
          { date: { gte: start, lte: end } },
          ...(status ? [{ type: status }] : []),
          ...(staffId ? [{ staffId }] : []),
          ...(village ? [{ customer: { village: { contains: village } } }] : []),
        ],
      },
      orderBy: { date: "desc" },
      include: { customer: { select: { fullName: true, customerCode: true } }, staff: { select: { fullName: true } } },
      take: 5000,
    });
    const income = rows.filter((r) => r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
    const expense = rows.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);
    result = {
      title: "Finance report",
      sheetName: "Finance",
      subtitle: `${rows.length} transactions · ${formatDate(start)} to ${formatDate(end)}`,
      columns: [
        { header: "Date", key: "date", weight: 1.1 },
        { header: "Type", key: "type", weight: 0.8 },
        { header: "Category", key: "category", weight: 1.4 },
        { header: "Description", key: "description", weight: 2.4 },
        { header: "Customer / Staff", key: "party", weight: 1.7 },
        { header: "Mode", key: "mode", weight: 0.8 },
        { header: "Amount", key: "amount", weight: 1.2, align: "right" },
      ],
      rows: rows.map((r) => ({
        date: formatDate(r.date),
        type: r.type === "INCOME" ? "Income" : "Expense",
        category: CATEGORY_LABELS[r.category] || r.category,
        description: r.description || "",
        party: r.customer?.fullName || r.staff?.fullName || "",
        mode: r.paymentMode,
        amount: r.amount,
      })),
      summary: [
        { label: "Total income", value: formatINR(income) },
        { label: "Total expense", value: formatINR(expense) },
        { label: "Net profit", value: formatINR(income - expense) },
      ],
    };
  } else if (report === "attendance") {
    const scope = await staffScope(user);
    const attendanceMonth = /^\d{4}-\d{2}$/.test(month) ? month : toInputDate(new Date()).slice(0, 7);
    const { start: mStart, end: mEnd } = monthRange(attendanceMonth);
    const rows = await prisma.attendance.findMany({
      where: {
        AND: [{ staff: scope }, { date: { gte: mStart, lte: mEnd } }, ...(staffId ? [{ staffId }] : []), ...(status ? [{ status }] : [])],
      },
      orderBy: [{ date: "asc" }, { staff: { fullName: "asc" } }],
      include: { staff: { select: { fullName: true, employeeId: true } } },
      take: 5000,
    });
    result = {
      title: "Attendance register",
      sheetName: "Attendance",
      subtitle: `${monthLabel(attendanceMonth)} · ${rows.length} records`,
      columns: [
        { header: "Date", key: "date", weight: 1.1 },
        { header: "Employee", key: "employee", weight: 2 },
        { header: "Employee ID", key: "employeeId", weight: 1.1 },
        { header: "Status", key: "status", weight: 1.2 },
        { header: "Check-in", key: "checkIn", weight: 0.9 },
        { header: "Check-out", key: "checkOut", weight: 0.9 },
        { header: "OT hours", key: "overtime", weight: 0.8, align: "right" },
        { header: "Note", key: "note", weight: 2 },
      ],
      rows: rows.map((r) => ({
        date: formatDate(r.date),
        employee: r.staff.fullName,
        employeeId: r.staff.employeeId,
        status: ATTENDANCE_LABELS[r.status] || r.status,
        checkIn: r.checkIn || "",
        checkOut: r.checkOut || "",
        overtime: r.overtimeHours,
        note: r.note || "",
      })),
      summary: [
        { label: "Total records", value: rows.length },
        { label: "Present days", value: rows.filter((r) => r.status === "PRESENT").length },
        { label: "Absent days", value: rows.filter((r) => r.status === "ABSENT").length },
      ],
    };
  } else if (report === "installations") {
    const scope = await customerScope(user);
    const rows = await prisma.installation.findMany({
      where: {
        AND: [
          { customer: { AND: [scope, { isArchived: false }] } },
          { createdAt: { gte: start, lte: end } },
          ...(staffId ? [{ teamLeadId: staffId }] : []),
          ...(village ? [{ customer: { village: { contains: village } } }] : []),
          ...(status ? [{ completionStatus: status }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { fullName: true, customerCode: true, village: true } }, teamLead: { select: { fullName: true } } },
      take: 5000,
    });
    result = {
      title: "Installation report",
      sheetName: "Installations",
      subtitle: `${rows.length} installations · ${formatDate(start)} to ${formatDate(end)}`,
      columns: [
        { header: "Customer", key: "name", weight: 2 },
        { header: "Code", key: "code", weight: 1.3 },
        { header: "Village", key: "village", weight: 1.2 },
        { header: "kW", key: "capacity", weight: 0.7, align: "right" },
        { header: "Installed", key: "installed", weight: 1.1 },
        { header: "Team lead", key: "team", weight: 1.5 },
        { header: "Inverter", key: "inverter", weight: 1.6 },
        { header: "Inspection", key: "inspection", weight: 1 },
        { header: "Net meter", key: "netMeter", weight: 1 },
        { header: "Completion", key: "completion", weight: 1 },
      ],
      rows: rows.map((r) => ({
        name: r.customer.fullName,
        code: r.customer.customerCode,
        village: r.customer.village || "",
        capacity: r.capacityKw,
        installed: r.installationDate ? formatDate(r.installationDate) : "",
        team: r.teamLead?.fullName || "",
        inverter: `${r.inverterBrand || ""} ${r.inverterModel || ""}`.trim(),
        inspection: r.inspectionStatus,
        netMeter: r.netMeterStatus,
        completion: r.completionStatus,
      })),
      summary: [
        { label: "Total installations", value: rows.length },
        { label: "Completed", value: rows.filter((r) => r.completionStatus === "COMPLETED").length },
      ],
    };
  } else {
    throw new HttpError(400, "Unknown report type.");
  }

  if (!can(user, "reports.view")) throw new HttpError(403, "Report access required.");

  const companySettings = await prisma.setting.findMany({
    where: { key: { in: ["company_name", "company_address"] } },
  });
  const companyMap = Object.fromEntries(companySettings.map((s) => [s.key, s.value]));
  const company = {
    name: companyMap.company_name || "USHA ENTERPRISES",
    address: companyMap.company_address || "",
  };

  if (format === "xlsx") {
    const buffer = await buildExcel({
      sheetName: result.sheetName,
      title: result.title,
      subtitle: result.subtitle,
      columns: result.columns.map((c) => ({ header: c.header, key: c.key, width: Math.max(10, c.weight * 11) })),
      rows: result.rows,
      summary: result.summary,
      company,
    });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${report}-${toInputDate(new Date())}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const pdfColumns: PdfColumn[] = result.columns.map((c) => ({ header: c.header, weight: c.weight, align: c.align }));
  const pdfRows = result.rows.map((row) =>
    result.columns.map((c) => {
      const value = row[c.key];
      return typeof value === "number" && ["cost", "salary", "gross", "deduction", "net", "amount"].includes(c.key)
        ? formatINR(value)
        : value ?? "";
    }),
  );
  const pdf = await buildTablePdf({
    title: result.title,
    subtitle: result.subtitle,
    columns: pdfColumns,
    rows: pdfRows,
    summary: result.summary,
    orientation: result.columns.length > 7 ? "landscape" : "portrait",
    footerNote: `Confidential — generated from ${company.name} ERP.`,
    company,
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report}-${toInputDate(new Date())}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
});
