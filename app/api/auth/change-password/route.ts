import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { passwordChangeSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/auth";

export const POST = withApi(async (request) => {
  const user = await requireApi();
  const input = await parseBody(request, passwordChangeSchema);

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record) throw new HttpError(404, "User not found.");

  const valid = await verifyPassword(input.currentPassword, record.passwordHash);
  if (!valid) throw new HttpError(422, "Current password galat hai.");

  if (await verifyPassword(input.newPassword, record.passwordHash)) {
    throw new HttpError(422, "New password purane password se alag hona chahiye.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(input.newPassword),
      mustChangePassword: false,
    },
  });

  await auditRequest(user, request, "PASSWORD_CHANGE", "User", user.id, { email: user.email });
  return json({ ok: true });
});
