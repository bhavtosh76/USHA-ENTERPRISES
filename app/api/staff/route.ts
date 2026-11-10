import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { staffSchema } from "@/lib/validation";
import { nextEmployeeId } from "@/lib/ids";
import { hashPassword } from "@/lib/auth";

export const POST = withApi(async (request) => {
  const user = await requireApi("staff.manage");
  const input = await parseBody(request, staffSchema);

  if (!input.email) throw new HttpError(422, "Login email is required for a staff account.");
  if (!input.password) throw new HttpError(422, "A temporary password is required.");
  if (input.roleKey === "SUPER_ADMIN" && user.roleKey !== "SUPER_ADMIN") {
    throw new HttpError(403, "Only the Super Admin can create another Super Admin.");
  }

  const role = await prisma.role.findUnique({ where: { key: input.roleKey } });
  if (!role) throw new HttpError(422, "Invalid role selected.");

  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new HttpError(409, "This email is already registered. Use a different email.");

  if (input.reportsToId) {
    const manager = await prisma.staff.findUnique({ where: { id: input.reportsToId } });
    if (!manager) throw new HttpError(422, "Reporting manager not found.");
  }

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
          designation: input.designation,
          department: input.department,
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

  await auditRequest(user, request, "CREATE", "Staff", created.staff?.id, {
    employeeId,
    name: input.fullName,
    role: input.roleKey,
    email: input.email,
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
