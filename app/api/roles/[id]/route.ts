import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { roleUpdateSchema } from "@/lib/validation";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export const PATCH = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("settings.manage");
  const { id } = await context.params;
  const input = await parseBody(request, roleUpdateSchema);

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new HttpError(404, "Role not found.");
  if (role.key === "SUPER_ADMIN") {
    throw new HttpError(422, "Super Admin permissions fixed hain aur change nahi ho sakti.");
  }

  const allowed = new Set<string>(ALL_PERMISSIONS);
  const permissions = Array.from(new Set(input.permissions.filter((p) => allowed.has(p))));

  const updated = await prisma.role.update({
    where: { id },
    data: { permissions: JSON.stringify(permissions) },
  });

  await auditRequest(user, request, "UPDATE", "Role", id, {
    role: updated.key,
    permissions,
  });

  return json({ ok: true, permissions });
});
