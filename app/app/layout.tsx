import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: {
      OR: [{ userId: user.id }, { roleKey: user.roleKey }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <ToastProvider>
      <AppShell
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          roleKey: user.roleKey,
          roleName: user.roleName,
          permissions: user.permissions,
          staffId: user.staffId,
          designation: user.designation,
        }}
        notifications={notifications.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          link: n.link,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        }))}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
