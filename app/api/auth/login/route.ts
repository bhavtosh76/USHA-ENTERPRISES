import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientIp, createSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email and password." }, { status: 422 });
  }
  const { email, password } = parsed.data;

  const limit = rateLimit(`login:${ip}:${email}`, 8, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Please retry after ${limit.retryAfter} seconds.` },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  const success = Boolean(user && user.isActive && (await verifyPassword(password, user.passwordHash)));

  await prisma.loginHistory.create({
    data: {
      userId: user?.id ?? null,
      email,
      success,
      ip,
      userAgent: request.headers.get("user-agent") ?? null,
    },
  });

  if (!success || !user) {
    await logAudit({
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user?.id,
      details: { email, reason: user ? "invalid_password_or_inactive" : "unknown_user" },
      headers: request.headers,
    });
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit({
    user: { id: user.id, name: user.name },
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    details: { role: user.role.key },
    headers: request.headers,
  });

  return NextResponse.json({
    ok: true,
    mustChangePassword: user.mustChangePassword,
    role: user.role.key,
  });
}
