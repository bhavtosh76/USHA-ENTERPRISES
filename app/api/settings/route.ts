import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest } from "@/lib/api";
import { settingsSchema } from "@/lib/validation";

export const PATCH = withApi(async (request) => {
  const user = await requireApi("settings.manage");
  const input = await parseBody(request, settingsSchema);

  const entries = Object.entries(input).map(([key, value]) => [key, String(value ?? "")] as const);

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );

  await auditRequest(user, request, "UPDATE", "Settings", null, {
    keys: entries.map(([k]) => k),
  });

  return json({ ok: true, updated: entries.length });
});
