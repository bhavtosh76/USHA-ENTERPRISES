import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { userUpdateSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";

export const PATCH = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const actor = await requireApi("settings.manage");
  const { id } = await context.params;
  const input = await parseBody(request, userUpdateSchema);

  const existing = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!existing) throw new HttpError(404, "User not found.");

  if (existing.role.key === "SUPER_ADMIN" && actor.roleKey !== "SUPER_ADMIN") {
    throw new HttpError(403, "Only the owner can modify a Super Admin account.");
  }
  if (input.roleKey === "SUPER_ADMIN" && actor.roleKey !== "SUPER_ADMIN") {
    throw new HttpError(403, "Only the owner can grant Super Admin access.");
  }
  if (id === actor.id && input.isActive === false) {
    throw new HttpError(422, "Aap apna hi account deactivate nahi kar sakte.");
  }

  let roleId: string | undefined;
  if (input.roleKey) {
    const role = await prisma.role.findUnique({ where: { key: input.roleKey } });
    if (!role) throw new HttpError(422, "Selected role does not exist.");
    roleId = role.id;
  }

  if (input.email && input.email !== existing.email) {
    const duplicate = await prisma.user.findUnique({ where: { email: input.email } });
    if (duplicate) throw new HttpError(409, "This email is already registered.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(roleId ? { roleId } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      ...(input.mustChangePassword !== undefined ? { mustChangePassword: input.mustChangePassword } : {}),
      ...(input.password ? { mustChangePassword: true } : {}),
    },
    include: { role: true },
  });

  await auditRequest(actor, request, "UPDATE", "User", id, {
    email: updated.email,
    role: updated.role.key,
    isActive: updated.isActive,
    passwordReset: Boolean(input.password),
  });

  return json({ ok: true, id: updated.id });
});

export const DELETE = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const actor = await requireApi("settings.manage");
  const { id } = await context.params;
  if (id === actor.id) throw new HttpError(422, "Aap apna account delete nahi kar sakte.");

  const existing = await prisma.user.findUnique({ where: { id }, include: { role: true, staff: true } });
  if (!existing) throw new HttpError(404, "User not found.");
  if (existing.role.key === "SUPER_ADMIN" && actor.roleKey !== "SUPER_ADMIN") {
    throw new HttpError(403, "Only the owner can remove a Super Admin account.");
  }
  if (existing.staff) {
    throw new HttpError(422, "Staff login ko deactivate karein. Delete karne se staff record orphan ho jayega.");
  }

  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await auditRequest(actor, request, "DEACTIVATE", "User", id, { email: existing.email });
  return json({ ok: true, deactivated: true });
});
