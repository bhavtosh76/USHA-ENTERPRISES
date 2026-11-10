import "server-only";
import { prisma } from "./db";
import type { AuthUser } from "./auth";

type AuditInput = {
  user?: Pick<AuthUser, "id" | "name"> | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: unknown;
  headers?: Headers;
};

/** Append-only audit trail. Never throws into the caller's flow. */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.user?.id ?? null,
        userName: input.user?.name ?? "System",
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        details: input.details ? JSON.stringify(input.details).slice(0, 4000) : null,
        ip: input.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: input.headers?.get("user-agent") ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed", error);
  }
}
