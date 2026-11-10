import { prisma } from "@/lib/db";
import { parseBody, withApi, json } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/auth";

const GENERIC_MESSAGE =
  "Agar ye email hamare system mein registered hai, to admin ko reset request bhej di gayi hai. Admin aapse contact karke naya temporary password dega.";

/**
 * Public endpoint. Never reveals whether an email exists in the system.
 * A request row is created for admins to act on; no password is emailed.
 */
export const POST = withApi(async (request) => {
  const input = await parseBody(request, forgotPasswordSchema);

  const limit = rateLimit(`forgot:${clientIp(request.headers)}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return json(
      { error: `Too many reset requests. Please retry after ${limit.retryAfter} seconds.` },
      429,
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, name: true, isActive: true },
  });

  if (user?.isActive) {
    const recent = await prisma.passwordResetRequest.findFirst({
      where: {
        email: input.email,
        status: "PENDING",
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
      select: { id: true },
    });

    if (!recent) {
      await prisma.passwordResetRequest.create({
        data: {
          email: input.email,
          userId: user.id,
          requestIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        },
      });

      const admins = await prisma.user.findMany({
        where: { isActive: true, role: { key: { in: ["SUPER_ADMIN", "ADMIN"] } } },
        select: { id: true },
      });

      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: "Password reset request",
            message: `${user.name} (${user.email}) ne password reset request bheji hai.`,
            type: "WARNING",
            link: "/app/settings?tab=users",
          })),
        });
      }

      await logAudit({
        action: "PASSWORD_RESET_REQUEST",
        entity: "User",
        entityId: user.id,
        details: { email: user.email },
        headers: request.headers,
      });
    }
  }

  return json({ ok: true, message: GENERIC_MESSAGE });
});
