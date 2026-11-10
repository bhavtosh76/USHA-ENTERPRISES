import { prisma } from "@/lib/db";
import { requireApi, withApi, json } from "@/lib/api";

export const POST = withApi(async () => {
  const user = await requireApi();
  const result = await prisma.notification.updateMany({
    where: {
      isRead: false,
      OR: [{ userId: user.id }, { roleKey: user.roleKey }],
    },
    data: { isRead: true },
  });
  return json({ ok: true, updated: result.count });
});
