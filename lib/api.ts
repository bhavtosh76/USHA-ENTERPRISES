import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type output } from "zod";
import { getSessionUser, can, type AuthUser } from "./auth";
import { logAudit } from "./audit";

export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export async function requireApi(permission?: string): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Login required. Aapka session expire ho gaya hai.");
  if (permission && !can(user, permission)) {
    throw new HttpError(403, "You do not have permission for this action.");
  }
  return user;
}

export async function parseBody<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(422, "Validation failed.", result.error.flatten());
  }
  return result.data;
}

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** Wrap an API route: consistent error shape + audit of failures. */
export function withApi(handler: Handler) {
  return async (request: Request, context: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json(
          { error: error.message, details: error.details ?? null },
          { status: error.status },
        );
      }
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed.", details: error.flatten() },
          { status: 422 },
        );
      }
      console.error("[api]", error);
      return NextResponse.json(
        { error: "Something went wrong on the server. Please try again." },
        { status: 500 },
      );
    }
  };
}

export async function auditRequest(
  user: AuthUser,
  request: Request,
  action: string,
  entity: string,
  entityId?: string | null,
  details?: unknown,
): Promise<void> {
  await logAudit({ user, action, entity, entityId, details, headers: request.headers });
}
