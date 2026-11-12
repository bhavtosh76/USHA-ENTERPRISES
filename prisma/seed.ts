/**
 * USHA ENTERPRISES — seed
 *
 * Creates roles, permissions, company settings, subsidy scheme rules and
 * (optionally) a demo operating dataset so the owner can evaluate every module.
 *
 * Set SEED_DEMO=false to seed only the owner account + configuration.
 * Demo records are safe to delete with `npm run db:clean`.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEPARTMENTS, ROLE_KEYS, ROLE_LABELS } from "../lib/constants";
import { DEFAULT_DESIGNATIONS, canonicalDesignation } from "../lib/org-config";
import {
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
} from "../lib/permissions";

const prisma = new PrismaClient();

const DEMO = process.env.SEED_DEMO !== "false";
const YEAR = new Date().getFullYear();
const THIS_MONTH = `${YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

function monthKey(offset: number) {
  const d = new Date(YEAR, new Date().getMonth() - offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function daysAgo(n: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function monthDate(offset: number, day: number) {
  return new Date(YEAR, new Date().getMonth() - offset, day, 10, 0, 0);
}

/**
 * Organisation bootstrap. Safe to run on every seed (idempotent):
 *  1. create the department + designation catalogue
 *  2. give the owner user a real Staff row so the tree has a Super Admin root
 *  3. canonicalise legacy designation strings onto Designation rows
 *  4. attach every top-level employee under the owner
 */
async function finalizeOrg(ownerUserId: string) {
  console.log("→ Organisation catalogue");

  const departmentIds = new Map<string, string>();
  for (const name of DEPARTMENTS) {
    const department = await prisma.department.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    departmentIds.set(name, department.id);
  }

  const designationByName = new Map<
    string,
    { id: string; level: number; department: string }
  >();
  for (const [index, d] of DEFAULT_DESIGNATIONS.entries()) {
    const departmentId = departmentIds.get(d.department) ?? null;
    const row = await prisma.designation.upsert({
      where: { name: d.name },
      create: {
        name: d.name,
        level: d.level,
        description: d.description ?? null,
        departmentId,
        isSystem: true,
        sortOrder: index,
      },
      update: {
        level: d.level,
        description: d.description ?? null,
        departmentId,
        isSystem: true,
        sortOrder: index,
      },
    });
    designationByName.set(row.name, {
      id: row.id,
      level: row.level,
      department: d.department,
    });
  }

  const ownerUser = await prisma.user.findUniqueOrThrow({
    where: { id: ownerUserId },
    include: { staff: true },
  });
  const superAdmin = designationByName.get("Super Admin");
  const managementId = departmentIds.get("Management") ?? null;

  let ownerStaffId = ownerUser.staff?.id ?? null;
  if (!ownerStaffId) {
    const existing = await prisma.staff.findUnique({
      where: { employeeId: "UE-EMP-000" },
      select: { id: true },
    });
    if (existing) {
      await prisma.staff.update({
        where: { id: existing.id },
        data: { userId: ownerUserId },
      });
      ownerStaffId = existing.id;
    } else {
      const created = await prisma.staff.create({
        data: {
          employeeId: "UE-EMP-000",
          userId: ownerUserId,
          fullName: ownerUser.name,
          mobile: "0000000000",
          email: ownerUser.email,
          joiningDate: new Date(YEAR - 2, 0, 1),
          designation: "Super Admin",
          designationId: superAdmin?.id ?? null,
          department: "Management",
          departmentId: managementId,
          status: "ACTIVE",
          notes: "Company owner — root of the organisation tree.",
        },
      });
      ownerStaffId = created.id;
    }
  }
  if (ownerStaffId) {
    await prisma.staff.update({
      where: { id: ownerStaffId },
      data: {
        reportsToId: null,
        designation: "Super Admin",
        designationId: superAdmin?.id ?? null,
        department: "Management",
        departmentId: managementId,
        status: "ACTIVE",
      },
    });
  }

  const existingStaff = await prisma.staff.findMany({
    select: { id: true, designation: true, department: true, designationId: true, departmentId: true },
  });
  for (const member of existingStaff) {
    const canonical = canonicalDesignation(member.designation);
    const designation = designationByName.get(canonical);
    const departmentName =
      member.department || designation?.department || "Management";
    const departmentId = departmentIds.get(departmentName) ?? null;
    if (
      member.designation !== canonical ||
      member.designationId !== (designation?.id ?? null) ||
      member.department !== departmentName ||
      member.departmentId !== departmentId
    ) {
      await prisma.staff.update({
        where: { id: member.id },
        data: {
          designation: canonical,
          designationId: designation?.id ?? null,
          department: departmentName,
          departmentId,
        },
      });
    }
  }

  // Every employee without a reporting manager hangs directly under the owner.
  if (ownerStaffId) {
    await prisma.staff.updateMany({
      where: { reportsToId: null, id: { not: ownerStaffId } },
      data: { reportsToId: ownerStaffId },
    });
  }

  const [departments, designations, staffCount] = await Promise.all([
    prisma.department.count(),
    prisma.designation.count(),
    prisma.staff.count(),
  ]);
  console.log(
    `   ${departments} departments · ${designations} designations · ${staffCount} employees`,
  );
}

async function main() {
  console.log("→ Seeding roles & permissions");
  for (const key of ROLE_KEYS) {
    const permissions: string[] = ROLE_PERMISSIONS[key].includes("*" as never)
      ? ["*"]
      : [...ROLE_PERMISSIONS[key]];
    await prisma.role.upsert({
      where: { key },
      create: {
        key,
        name: ROLE_LABELS[key],
        description: ROLE_DESCRIPTIONS[key],
        permissions: JSON.stringify(permissions),
        isSystem: true,
      },
      update: {
        name: ROLE_LABELS[key],
        description: ROLE_DESCRIPTIONS[key],
        permissions: JSON.stringify(permissions),
      },
    });
  }
  console.log(`   roles: ${ROLE_KEYS.length}, permissions: ${ALL_PERMISSIONS.length}`);

  console.log("→ Company settings");
  const defaults: Record<string, string> = {
    company_name: "USHA ENTERPRISES",
    company_address:
      "Ghungchai Chauraha, Super Market, Puranpur, Pilibhit, Uttar Pradesh, India",
    company_phone: "+91 00000 00000",
    company_email: "info@ushaenterprises.in",
    company_gst: "",
    company_signatory: "Authorised Signatory",
    subsidy_disclaimer:
      "Yeh subsidy estimate hai. Actual subsidy customer ki eligibility, DISCOM feasibility approval aur Government sanction par depend karti hai. Rates admin settings se update hote hain.",
    default_working_days: "26",
    overtime_rate: "0",
    default_system_cost_per_kw: "70000",
    notify_email: "",
    notify_whatsapp: "",
    session_minutes: "480",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  console.log("→ Owner account");
  const superRole = await prisma.role.findUniqueOrThrow({ where: { key: "SUPER_ADMIN" } });
  const ownerPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
  const owner = await prisma.user.upsert({
    where: { email: "admin@ushaenterprises.in" },
    create: {
      email: "admin@ushaenterprises.in",
      name: "Usha Enterprises Owner",
      passwordHash: await bcrypt.hash(ownerPassword, 12),
      roleId: superRole.id,
      mustChangePassword: false,
    },
    update: {},
  });
  console.log(`   owner: ${owner.email} / ${ownerPassword}`);

  console.log("→ Subsidy scheme configuration");
  const schemes = [
    {
      schemeCode: "PMSG-CENTRAL-1-2KW",
      name: "PM Surya Ghar: Muft Bijli Yojana — Central (up to 2 kW)",
      capacityMinKw: 0,
      capacityMaxKw: 2,
      centralRatePerKw: 30000,
      stateRatePerKw: 0,
      maxSubsidy: 60000,
      notes:
        "Central financial assistance of Rs.30,000 per kW for the first 2 kW. Verify current rates at pmsuryaghar.gov.in before relying on them.",
    },
    {
      schemeCode: "PMSG-CENTRAL-3KW",
      name: "PM Surya Ghar — Central (third kW)",
      capacityMinKw: 2,
      capacityMaxKw: 3,
      centralRatePerKw: 18000,
      stateRatePerKw: 0,
      maxSubsidy: 18000,
      notes: "Additional Rs.18,000 for the third kW, taking the central cap to Rs.78,000.",
    },
    {
      schemeCode: "PMSG-CENTRAL-CAP",
      name: "PM Surya Ghar — above 3 kW (capped)",
      capacityMinKw: 3,
      capacityMaxKw: 100,
      centralRatePerKw: 0,
      stateRatePerKw: 0,
      maxSubsidy: 0,
      notes: "No additional central subsidy beyond 3 kW; total central cap remains Rs.78,000.",
    },
    {
      schemeCode: "UP-STATE-15K-CAP30K",
      name: "Uttar Pradesh State Subsidy (UPNEDA) — ₹15,000/kW, max ₹30,000",
      capacityMinKw: 0,
      capacityMaxKw: 100,
      centralRatePerKw: 0,
      stateRatePerKw: 15000,
      maxSubsidy: 30000,
      notes:
        "UPNEDA residential rooftop solar subsidy: Rs.15,000 per kW, capped at Rs.30,000 per customer. Combined with the central PM Surya Ghar subsidy the maximum is Rs.1,08,000. Verify the latest UPNEDA notification before quoting.",
    },
  ];

  // Remove the old zero-rate UP placeholder from databases seeded before the
  // UPNEDA rates were verified.
  await prisma.subsidyScheme.deleteMany({ where: { schemeCode: "UP-STATE-PLACEHOLDER" } });

  for (const s of schemes) {
    await prisma.subsidyScheme.upsert({
      where: { schemeCode: s.schemeCode },
      create: {
        ...s,
        effectiveFrom: new Date("2024-02-15"),
        state: s.schemeCode.startsWith("UP") ? "Uttar Pradesh" : "ALL",
        eligibility:
          "Residential rooftop solar connection with valid DISCOM consumer number. Final eligibility subject to Government / DISCOM approval.",
        sourceUrl: s.schemeCode.startsWith("UP")
          ? "https://upneda.org.in"
          : "https://pmsuryaghar.gov.in",
        isActive: true,
      },
      update: {
        name: s.name,
        capacityMinKw: s.capacityMinKw,
        capacityMaxKw: s.capacityMaxKw,
        centralRatePerKw: s.centralRatePerKw,
        stateRatePerKw: s.stateRatePerKw,
        maxSubsidy: s.maxSubsidy,
        notes: s.notes,
      },
    });
  }

  if (!DEMO) {
    await finalizeOrg(owner.id);
    console.log("SEED_DEMO=false - skipping demo dataset.");
    return;
  }

  const existingStaff = await prisma.staff.count();
  if (existingStaff > 0) {
    await finalizeOrg(owner.id);
    console.log("Demo staff already present - skipping demo dataset.");
    return;
  }

  console.log("→ Demo staff & users");
  const roleByKey = Object.fromEntries(
    (await prisma.role.findMany()).map((r) => [r.key, r.id]),
  );

  const staffSeed = [
    {
      fullName: "Rajesh Kumar Verma",
      designation: "R Manager",
      department: "Management",
      roleKey: "MANAGER",
      mobile: "9876543210",
      salary: 45000,
      area: "Puranpur",
      email: "rajesh@ushaenterprises.in",
      incentiveRate: 2,
      commissionRate: 0.5,
    },
    {
      fullName: "Anita Sharma",
      designation: "AREA Manager",
      department: "Sales",
      roleKey: "AREA_MANAGER",
      mobile: "9876543211",
      salary: 32000,
      area: "Puranpur",
      email: "anita@ushaenterprises.in",
      incentiveRate: 3,
      commissionRate: 0.5,
    },
    {
      fullName: "Sunil Yadav",
      designation: "Team Leader",
      department: "Field Operations",
      roleKey: "TEAM_LEADER",
      mobile: "9876543212",
      salary: 24000,
      area: "Bisalpur",
      email: "sunil@ushaenterprises.in",
      incentiveRate: 3,
      commissionRate: 0.75,
    },
    {
      fullName: "Pooja Gupta",
      designation: "Document Collection Executive",
      department: "Documentation",
      roleKey: "FIELD_STAFF",
      mobile: "9876543213",
      salary: 15000,
      area: "Puranpur",
      email: "pooja@ushaenterprises.in",
      incentiveRate: 4,
      commissionRate: 1,
    },
    {
      fullName: "Vikas Singh",
      designation: "Sales Executive",
      department: "Sales",
      roleKey: "FIELD_STAFF",
      mobile: "9876543214",
      salary: 16000,
      area: "Bisalpur",
      email: "vikas@ushaenterprises.in",
      incentiveRate: 4,
      commissionRate: 1,
    },
    {
      fullName: "Mohit Saxena",
      designation: "Installation Staff",
      department: "Installation",
      roleKey: "FIELD_STAFF",
      mobile: "9876543215",
      salary: 18000,
      area: "Puranpur",
      email: "mohit@ushaenterprises.in",
      incentiveRate: 2,
      commissionRate: 0.5,
    },
    {
      fullName: "Neha Agarwal",
      designation: "Accountant",
      department: "Accounts",
      roleKey: "ACCOUNTANT",
      mobile: "9876543216",
      salary: 22000,
      area: "Puranpur",
      email: "neha@ushaenterprises.in",
      incentiveRate: 0,
      commissionRate: 0,
    },
  ];

  const staffByEmail: Record<string, { id: string }> = {};
  let empCounter = 0;
  for (const s of staffSeed) {
    empCounter += 1;
    const user = await prisma.user.create({
      data: {
        email: s.email,
        name: s.fullName,
        passwordHash: await bcrypt.hash("Staff@12345", 12),
        roleId: roleByKey[s.roleKey],
        staff: {
          create: {
            employeeId: `UE-EMP-${String(empCounter).padStart(3, "0")}`,
            fullName: s.fullName,
            mobile: s.mobile,
            email: s.email,
            joiningDate: new Date(YEAR - 1, 3, 15),
            designation: s.designation,
            department: s.department,
            monthlySalary: s.salary,
            targetMonthly: s.salary * 4,
            incentiveRate: s.incentiveRate,
            commissionRate: s.commissionRate,
            area: s.area,
            bankName: "State Bank of India",
            bankAccount: `3021${Math.floor(100000 + Math.random() * 899999)}`,
            bankIfsc: "SBIN0001234",
            status: "ACTIVE",
          },
        },
      },
      include: { staff: true },
    });
    staffByEmail[s.email] = { id: user.staff!.id };
  }

  // hierarchy
  const manager = staffByEmail["rajesh@ushaenterprises.in"].id;
  const areaManager = staffByEmail["anita@ushaenterprises.in"].id;
  const teamLeader = staffByEmail["sunil@ushaenterprises.in"].id;
  await prisma.staff.update({ where: { id: areaManager }, data: { reportsToId: manager } });
  await prisma.staff.update({ where: { id: teamLeader }, data: { reportsToId: areaManager } });
  for (const email of ["pooja@ushaenterprises.in", "vikas@ushaenterprises.in"]) {
    await prisma.staff.update({ where: { id: staffByEmail[email].id }, data: { reportsToId: teamLeader } });
  }
  await prisma.staff.update({ where: { id: staffByEmail["mohit@ushaenterprises.in"].id }, data: { reportsToId: manager } });
  await prisma.staff.update({ where: { id: staffByEmail["neha@ushaenterprises.in"].id }, data: { reportsToId: manager } });

  await prisma.counter.upsert({
    where: { key: "employee" },
    create: { key: "employee", value: empCounter },
    update: { value: empCounter },
  });

  console.log("→ Demo customers");
  const fieldStaff = [
    staffByEmail["pooja@ushaenterprises.in"].id,
    staffByEmail["vikas@ushaenterprises.in"].id,
  ];
  const customers = [
    { name: "Ramesh Chandra", father: "Sohan Lal", village: "Ghungchai", tehsil: "Puranpur", mobile: "9812345001", kw: 3, status: "SUBSIDY_RECEIVED", days: 95 },
    { name: "Sushila Devi", father: "Ram Swaroop", village: "Puranpur", tehsil: "Puranpur", mobile: "9812345002", kw: 2, status: "INSTALLATION_COMPLETED", days: 70 },
    { name: "Arjun Prasad", father: "Kailash Nath", village: "Bisalpur", tehsil: "Bisalpur", mobile: "9812345003", kw: 5, status: "UNDER_PROCESS", days: 40 },
    { name: "Meena Kumari", father: "Dinesh Kumar", village: "Barkhera", tehsil: "Barkhera", mobile: "9812345004", kw: 1, status: "DOCUMENTS_PENDING", days: 25 },
    { name: "Hari Om Gupta", father: "Shyam Lal", village: "Kalinagar", tehsil: "Puranpur", mobile: "9812345005", kw: 3, status: "APPROVED", days: 20 },
    { name: "Sarvesh Kumar", father: "Mohan Lal", village: "Madhotanda", tehsil: "Puranpur", mobile: "9812345006", kw: 2, status: "DOCUMENTS_VERIFIED", days: 14 },
    { name: "Kiran Devi", father: "Ramu Lal", village: "Amaria", tehsil: "Puranpur", mobile: "9812345007", kw: 3, status: "APPLICATION_SUBMITTED", days: 10 },
    { name: "Dharmendra Singh", father: "Balbir Singh", village: "Jahanabad", tehsil: "Bisalpur", mobile: "9812345008", kw: 4, status: "INSTALLATION_PENDING", days: 7 },
    { name: "Nisha Verma", father: "Pramod Verma", village: "Ghungchai", tehsil: "Puranpur", mobile: "9812345009", kw: 2, status: "NEW", days: 2 },
    { name: "Ram Kishore", father: "Ghanshyam", village: "Puranpur", tehsil: "Puranpur", mobile: "9812345010", kw: 1, status: "REJECTED", days: 55 },
  ];

  let cIndex = 0;
  const customerIds: string[] = [];
  for (const c of customers) {
    cIndex += 1;
    const code = `UE-C-${YEAR}-${String(cIndex).padStart(4, "0")}`;
    const assigned = fieldStaff[cIndex % fieldStaff.length];
    const created = await prisma.customer.create({
      data: {
        customerCode: code,
        fullName: c.name,
        fatherName: c.father,
        mobile: c.mobile,
        state: "Uttar Pradesh",
        district: "Pilibhit",
        tehsil: c.tehsil,
        village: c.village,
        address: `${c.village}, Tehsil ${c.tehsil}, Pilibhit, Uttar Pradesh`,
        pinCode: "262001",
        consumerNumber: `MVVNL${100000 + cIndex}`,
        discom: "MVVNL",
        connectionType: "DOMESTIC",
        sanctionedLoad: `${c.kw} kW`,
        capacityKw: c.kw,
        applicationDate: daysAgo(c.days),
        assignedStaffId: assigned,
        status: c.status,
        createdById: owner.id,
        remarks: c.status === "REJECTED" ? "Rejected by DISCOM — load mismatch. Customer informed." : null,
        history: {
          create: [
            { status: "NEW", note: "Customer registered by field staff.", changedById: owner.id, createdAt: daysAgo(c.days) },
            ...(c.status !== "NEW"
              ? [{ status: c.status, note: "Status updated.", changedById: owner.id, createdAt: daysAgo(Math.max(1, c.days - 5)) }]
              : []),
          ],
        },
      },
    });
    customerIds.push(created.id);
  }

  await prisma.counter.upsert({
    where: { key: `customer-${YEAR}` },
    create: { key: `customer-${YEAR}`, value: cIndex },
    update: { value: cIndex },
  });

  console.log("→ Demo installations");
  await prisma.installation.createMany({
    data: [
      {
        customerId: customerIds[0],
        capacityKw: 3,
        installationDate: daysAgo(80),
        teamLeadId: staffByEmail["mohit@ushaenterprises.in"].id,
        teamMembers: "Mohit Saxena, Ravi Kumar",
        inverterBrand: "Growatt",
        inverterModel: "MIN 3300TL-X",
        inverterSerial: "GRW3300-88421",
        panelBrand: "Waaree",
        panelModel: "WS-545",
        panelCount: 6,
        panelSerials: "WR545-1001, WR545-1002, WR545-1003, WR545-1004, WR545-1005, WR545-1006",
        inspectionStatus: "PASSED",
        inspectionDate: daysAgo(74),
        netMeterStatus: "INSTALLED",
        netMeterDate: daysAgo(70),
        completionStatus: "COMPLETED",
        remarks: "Installation completed and net meter installed.",
      },
      {
        customerId: customerIds[1],
        capacityKw: 2,
        installationDate: daysAgo(55),
        teamLeadId: staffByEmail["mohit@ushaenterprises.in"].id,
        inverterBrand: "Sungrow",
        inverterModel: "SG2K-S",
        inverterSerial: "SGR2K-55219",
        panelBrand: "Adani",
        panelModel: "AD-540",
        panelCount: 4,
        inspectionStatus: "PASSED",
        netMeterStatus: "APPLIED",
        completionStatus: "COMPLETED",
        remarks: "Net meter application submitted to DISCOM.",
      },
    ],
  });

  console.log("→ Demo attendance & payroll");
  const staffList = await prisma.staff.findMany({ where: { status: "ACTIVE" } });
  const today = new Date();
  for (const s of staffList) {
    for (let day = 1; day <= today.getDate(); day++) {
      const d = new Date(today.getFullYear(), today.getMonth(), day);
      if (d.getDay() === 0) continue;
      const status = day % 11 === 0 ? "ABSENT" : day % 17 === 0 ? "PAID_LEAVE" : "PRESENT";
      await prisma.attendance.create({
        data: {
          staffId: s.id,
          date: d,
          status,
          checkIn: status === "PRESENT" ? "09:45" : null,
          checkOut: status === "PRESENT" ? "18:15" : null,
          markedById: owner.id,
        },
      });
    }
  }

  const prevMonth = monthKey(1);
  const prevPrevMonth = monthKey(2);
  let slipCounter = 0;
  for (const s of staffList) {
    const monthly = s.monthlySalary;
    const perDay = monthly / 26;
    const incentive = Math.round(monthly * 0.08);
    const commission = Math.round(monthly * 0.03);
    const gross = monthly + incentive + commission;
    const absent = 1;
    const net = Math.round(gross - perDay * absent);
    slipCounter += 1;
    await prisma.salary.create({
      data: {
        staffId: s.id,
        month: prevMonth,
        fixedSalary: monthly,
        workingDays: 26,
        presentDays: 25,
        absentDays: absent,
        paidLeave: 0,
        unpaidLeave: 0,
        overtimeHours: 0,
        overtimeAmount: 0,
        incentive,
        commission,
        advance: 0,
        otherDeduction: 0,
        grossSalary: gross,
        netSalary: net,
        status: "PAID",
        slipNo: `UE-SL-${prevMonth.replace("-", "")}-${String(slipCounter).padStart(4, "0")}`,
        approvedById: owner.id,
        approvedAt: monthDate(1, 28),
        paidAt: monthDate(1, 28),
        paymentMode: "BANK",
        payments: {
          create: {
            amount: net,
            mode: "BANK",
            reference: `NEFT-${prevMonth}-${slipCounter}`,
            paidById: owner.id,
            paidAt: monthDate(1, 28),
          },
        },
      },
    });

    const net2 = Math.round(monthly + Math.round(monthly * 0.05) - perDay * 1);
    slipCounter += 1;
    await prisma.salary.create({
      data: {
        staffId: s.id,
        month: prevPrevMonth,
        fixedSalary: monthly,
        workingDays: 26,
        presentDays: 25,
        absentDays: 1,
        paidLeave: 0,
        unpaidLeave: 0,
        overtimeHours: 0,
        overtimeAmount: 0,
        incentive: Math.round(monthly * 0.05),
        commission: 0,
        advance: 0,
        otherDeduction: 0,
        grossSalary: monthly + Math.round(monthly * 0.05),
        netSalary: net2,
        status: "PAID",
        slipNo: `UE-SL-${prevPrevMonth.replace("-", "")}-${String(slipCounter).padStart(4, "0")}`,
        approvedById: owner.id,
        approvedAt: monthDate(2, 28),
        paidAt: monthDate(2, 28),
        paymentMode: "BANK",
        payments: {
          create: {
            amount: net2,
            mode: "BANK",
            reference: `NEFT-${prevPrevMonth}-${slipCounter}`,
            paidById: owner.id,
            paidAt: monthDate(2, 28),
          },
        },
      },
    });
  }

  console.log("→ Demo finance transactions");
  const txs: {
    type: "INCOME" | "EXPENSE";
    category: string;
    amount: number;
    date: Date;
    description: string;
    mode: string;
    customerId?: string;
  }[] = [];
  const incomePlan = [
    { offset: 3, base: 285000 },
    { offset: 2, base: 340000 },
    { offset: 1, base: 415000 },
    { offset: 0, base: 265000 },
  ];
  incomePlan.forEach((m, i) => {
    txs.push({
      type: "INCOME",
      category: "CUSTOMER_PAYMENT",
      amount: m.base,
      date: monthDate(m.offset, 12),
      description: "Customer installation payments collected",
      mode: "BANK",
      customerId: customerIds[i % customerIds.length],
    });
    txs.push({
      type: "INCOME",
      category: "SUBSIDY",
      amount: 42000 + i * 3500,
      date: monthDate(m.offset, 22),
      description: "Subsidy disbursement received from portal",
      mode: "BANK",
    });
    txs.push({
      type: "EXPENSE",
      category: "SALARY",
      amount: 168000 + i * 4000,
      date: monthDate(m.offset, 28),
      description: "Monthly staff salary disbursement",
      mode: "BANK",
    });
    txs.push({
      type: "EXPENSE",
      category: "PURCHASE",
      amount: 145000 + i * 9000,
      date: monthDate(m.offset, 8),
      description: "Solar panels, inverters and mounting material",
      mode: "BANK",
    });
    txs.push({
      type: "EXPENSE",
      category: "OFFICE",
      amount: 18500,
      date: monthDate(m.offset, 5),
      description: "Office rent, electricity and internet",
      mode: "UPI",
    });
    txs.push({
      type: "EXPENSE",
      category: "MARKETING",
      amount: 12000 + i * 1500,
      date: monthDate(m.offset, 16),
      description: "Village camps and local marketing",
      mode: "CASH",
    });
    txs.push({
      type: "EXPENSE",
      category: "TRAVEL",
      amount: 7500,
      date: monthDate(m.offset, 18),
      description: "Field staff travel reimbursement",
      mode: "CASH",
    });
  });
  await prisma.transaction.createMany({
    data: txs.map((t) => ({
      type: t.type,
      category: t.category,
      amount: t.amount,
      date: t.date,
      description: t.description,
      paymentMode: t.mode,
      customerId: t.customerId ?? null,
      createdById: owner.id,
    })),
  });

  console.log("→ Demo notifications");
  await prisma.notification.createMany({
    data: [
      {
        roleKey: "ADMIN",
        title: "Documents pending for 1 customer",
        message: "Meena Kumari (UE-C-" + YEAR + "-0004) is waiting for Aadhaar and bank documents.",
        type: "WARNING",
        link: "/app/customers",
      },
      {
        roleKey: "ADMIN",
        title: "Installation pending",
        message: "Dharmendra Singh (4 kW) is approved and awaiting installation scheduling.",
        type: "INFO",
        link: "/app/installations",
      },
      {
        roleKey: "ADMIN",
        title: "Subsidy received",
        message: "Ramesh Chandra — 3 kW subsidy has been marked received. Verify bank entry.",
        type: "SUCCESS",
        link: "/app/customers",
      },
      {
        userId: owner.id,
        title: "Payroll ready for review",
        message: `Attendance for ${THIS_MONTH} is available. Generate payroll when ready.`,
        type: "INFO",
        link: "/app/payroll",
      },
    ],
  });

  await finalizeOrg(owner.id);

  console.log("\n✔ Seed complete");
  console.log("   Owner   : admin@ushaenterprises.in / " + ownerPassword);
  console.log("   Staff   : rajesh@ushaenterprises.in / Staff@12345 (Manager)");
  console.log("             pooja@ushaenterprises.in / Staff@12345 (Field staff)");
  console.log("             neha@ushaenterprises.in / Staff@12345 (Accountant)");
  console.log("   IMPORTANT: change the owner password after first login.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
