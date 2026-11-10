import { NextResponse } from "next/server";
import { destroySession, getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  await destroySession();
  if (user) {
    await logAudit({
      user,
      action: "LOGOUT",
      entity: "User",
      entityId: user.id,
      headers: request.headers,
    });
  }
  return NextResponse.json({ ok: true });
}
