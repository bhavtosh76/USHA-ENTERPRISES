import { prisma } from "@/lib/db";
import { requireApi, withApi, json, HttpError } from "@/lib/api";

export const PATCH = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi();
  const { id } = await context.params;
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw new HttpError(404, "Notification not found.");
  if (notification.userId && notification.userId !== user.id) {
    throw new HttpError(403, "This notification is not yours.");
  }
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return json({ ok: true });
});
