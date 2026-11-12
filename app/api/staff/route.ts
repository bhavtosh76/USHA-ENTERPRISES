import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { staffSchema } from "@/lib/validation";
import { nextEmployeeId } from "@/lib/ids";
import { hashPassword } from "@/lib/auth";
import { canonicalDesignation, getOrgAccess, levelOf } from "@/lib/org";

const MANAGER_ALLOWED_ROLES = ["FIELD_STAFF", "TEAM_LEADER"];

export const POST = withApi(async (request) => {
  const user = await requireApi("staff.manage");
  const input = await parseBody(request, staffSchema);

  if (!input.email) throw new HttpError(422, "Login email is required for a staff account.");
  if (!input.password) throw new HttpError(422, "A temporary password is required.");
  if (input.roleKey === "SUPER_ADMIN" && user.roleKey !== "SUPER_ADMIN") {
    throw new HttpError(403, "Only the Super Admin can create another Super Admin.");
  }

  const access = await getOrgAccess(user);
  if (!access.all) {
    if (!MANAGER_ALLOWED_ROLES.includes(input.roleKey)) {
      throw new HttpError(403, "You can only create Team Leader or Field Staff accounts.");
    }
    if (!input.reportsToId || !access.ids?.has(input.reportsToId)) {
      throw new HttpError(403, "Select a reporting manager from your own team.");
    }
  }

  const role = await prisma.role.findUnique({ where: { key: input.roleKey } });
  if (!role) throw new HttpError(422, "Invalid role selected.");

  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new HttpError(409, "This email is already registered. Use a different email.");

  const canonical = canonicalDesignation(input.designation);
  const designation = await prisma.designation.findUnique({ where: { name: canonical } });
  if (designation && !access.all) {
    const actorStaff = user.staffId
      ? await prisma.staff.findUnique({
          where: { id: user.staffId },
          select: { designationRef: { select: { level: true } } },
        })
      : null;
    const actorLevel = actorStaff?.designationRef?.level ?? 0;
    if (designation.level >= actorLevel) {
      throw new HttpError(403, "Aap apne se senior designation wala employee create nahi kar sakte.");
    }
  }

  if (input.reportsToId) {
    const manager = await prisma.staff.findUnique({
      where: { id: input.reportsToId },
      select: {
        id: true,
        status: true,
        designation: true,
        designationRef: { select: { name: true, level: true } },
      },
    });
    if (!manager) throw new HttpError(422, "Reporting manager not found.");
    if (manager.status !== "ACTIVE") throw new HttpError(422, "Reporting manager is not active.");
    const employeeLevel = designation?.level ?? levelOf(canonical);
    const managerLevel = levelOf(
      manager.designationRef?.name ?? manager.designation,
      manager.designationRef?.level,
    );
    if (managerLevel <= employeeLevel) {
      throw new HttpError(422, "Reporting manager ka designation employee se senior hona chahiye.");
    }
  }

  const department = input.department
    ? await prisma.department.findUnique({ where: { name: input.department } })
    : null;

  const employeeId = await nextEmployeeId();

  const created = await prisma.user.create({
    data: {
      email: input.email,
      name: input.fullName,
      passwordHash: await hashPassword(input.password),
      roleId: role.id,
      mustChangePassword: true,
      staff: {
        create: {
          employeeId,
          fullName: input.fullName,
          mobile: input.mobile,
          altMobile: input.altMobile,
          email: input.email,
          address: input.address,
          joiningDate: new Date(input.joiningDate),
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender,
          employmentType: input.employmentType,
          designation: canonical,
          designationId: designation?.id ?? null,
          department: input.department,
          departmentId: department?.id ?? null,
          monthlySalary: input.monthlySalary,
          bankName: input.bankName,
          bankAccount: input.bankAccount,
          bankIfsc: input.bankIfsc,
          targetMonthly: input.targetMonthly,
          incentiveRate: input.incentiveRate,
          commissionRate: input.commissionRate,
          area: input.area,
          reportsToId: input.reportsToId,
          status: input.status,
          notes: input.notes,
        },
      },
    },
    include: { staff: true },
  });

  if (created.staff && input.reportsToId) {
    await prisma.employeeTransfer.create({
      data: {
        staffId: created.staff.id,
        fromManagerId: null,
        toManagerId: input.reportsToId,
        fromDesignation: null,
        toDesignation: canonical,
        reason: "Initial reporting manager assigned on employee creation.",
        transferredById: user.id,
      },
    });
  }

  await auditRequest(user, request, "CREATE", "Staff", created.staff?.id, {
    employeeId,
    name: input.fullName,
    role: input.roleKey,
    email: input.email,
    reportsToId: input.reportsToId,
  });

  await prisma.notification.create({
    data: {
      userId: created.id,
      title: "Welcome to USHA ENTERPRISES",
      message: "Aapka staff account create ho gaya hai. Pehle login par password change karein.",
      type: "INFO",
      link: "/app/profile",
    },
  });

  return json({ ok: true, staff: { id: created.staff?.id } }, 201);
});
