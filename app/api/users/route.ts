import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { userSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";

export const POST = withApi(async (request) => {
  const user = await requireApi("settings.manage");
  const input = await parseBody(request, userSchema);

  const role = await prisma.role.findUnique({ where: { key: input.roleKey } });
  if (!role) throw new HttpError(422, "Selected role does not exist.");
  if (role.key === "SUPER_ADMIN" && user.roleKey !== "SUPER_ADMIN") {
    throw new HttpError(403, "Only the owner can create another Super Admin.");
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, "This email is already registered.");

  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      roleId: role.id,
      passwordHash: await hashPassword(input.password),
      isActive: input.isActive,
      mustChangePassword: true,
    },
  });

  await auditRequest(user, request, "CREATE", "User", created.id, {
    email: created.email,
    role: role.key,
  });

  return json({ ok: true, id: created.id }, 201);
});
