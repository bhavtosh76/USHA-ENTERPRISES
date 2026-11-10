import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { hasPermission, parsePermissions } from "./permissions";

export const SESSION_COOKIE = "ue_session";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "usha-enterprises-dev-secret-change-me",
);

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  permissions: string[];
  staffId: string | null;
  designation: string | null;
  mustChangePassword: boolean;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const minutes = Number(process.env.SESSION_MINUTES || 480);
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("usha-enterprises")
    .setExpirationTime(`${minutes}m`)
    .sign(secret);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: minutes * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export const getSessionUser = cache(async (): Promise<AuthUser | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: "usha-enterprises" });
    const userId = String(payload.sub || "");
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, staff: true },
    });
    if (!user || !user.isActive) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roleKey: user.role.key,
      roleName: user.role.name,
      permissions: parsePermissions(user.role.permissions),
      staffId: user.staff?.id ?? null,
      designation: user.staff?.designation ?? null,
      mustChangePassword: user.mustChangePassword,
    };
  } catch {
    return null;
  }
});

export function can(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  return hasPermission(user.roleKey, user.permissions, permission);
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permission: string): Promise<AuthUser> {
  const user = await requireUser();
  if (!can(user, permission)) redirect("/app/forbidden");
  return user;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}
