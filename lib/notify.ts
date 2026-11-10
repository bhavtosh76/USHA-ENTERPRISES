import "server-only";
import { prisma } from "./db";

type NotifyInput = {
  title: string;
  message: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "DANGER";
  link?: string;
  roleKey?: string;
  userId?: string;
};

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        title: input.title,
        message: input.message,
        type: input.type ?? "INFO",
        link: input.link,
        roleKey: input.roleKey ?? null,
        userId: input.userId ?? null,
      },
    });
  } catch (error) {
    console.error("[notify] failed", error);
  }
}

/** Notify every active Admin + Super Admin. */
export async function notifyAdmins(input: Omit<NotifyInput, "roleKey" | "userId">): Promise<void> {
  await Promise.all([
    notify({ ...input, roleKey: "ADMIN" }),
    notify({ ...input, roleKey: "SUPER_ADMIN" }),
  ]);
}
