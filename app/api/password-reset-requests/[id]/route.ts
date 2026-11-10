import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { resetRequestActionSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";

export const PATCH = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const actor = await requireApi("settings.manage");
  const { id } = await context.params;
  const input = await parseBody(request, resetRequestActionSchema);

  const resetRequest = await prisma.passwordResetRequest.findUnique({ where: { id } });
  if (!resetRequest) throw new HttpError(404, "Reset request not found.");
  if (resetRequest.status !== "PENDING") {
    throw new HttpError(422, "Ye request already handle ho chuki hai.");
  }

  if (input.action === "DISMISS") {
    await prisma.passwordResetRequest.update({
      where: { id },
      data: {
        status: "DISMISSED",
        note: input.note ?? null,
        handledAt: new Date(),
        handledById: actor.id,
      },
    });
    await auditRequest(actor, request, "PASSWORD_RESET_DISMISS", "PasswordResetRequest", id, {
      email: resetRequest.email,
    });
    return json({ ok: true, status: "DISMISSED" });
  }

  const user = resetRequest.userId
    ? await prisma.user.findUnique({ where: { id: resetRequest.userId } })
    : await prisma.user.findUnique({ where: { email: resetRequest.email } });
  if (!user) throw new HttpError(404, "Is request ka user account nahi mila.");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(input.password),
        mustChangePassword: true,
      },
    }),
    prisma.passwordResetRequest.update({
      where: { id },
      data: {
        status: "RESOLVED",
        note: input.note ?? null,
        handledAt: new Date(),
        handledById: actor.id,
      },
    }),
  ]);

  await auditRequest(actor, request, "PASSWORD_RESET", "User", user.id, {
    email: user.email,
    requestId: id,
    source: "forgot-password",
  });

  return json({ ok: true, status: "RESOLVED", userId: user.id });
});
