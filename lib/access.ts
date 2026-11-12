import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { can, type AuthUser } from "./auth";
import { collectDescendantIds } from "./org";

/**
 * Row-level visibility.
 * - customer.view_all  -> everything
 * - Field staff        -> only customers assigned to them
 * - Team Leader        -> own + direct reports
 * - Area Manager       -> own + direct reports + staff in same area
 */
export async function customerScope(user: AuthUser): Promise<Prisma.CustomerWhereInput> {
  if (can(user, "customer.view_all")) return {};
  if (!user.staffId) return { id: "__none__" };

  if (["TEAM_LEADER", "AREA_MANAGER", "MANAGER"].includes(user.roleKey)) {
    const me = await prisma.staff.findUnique({
      where: { id: user.staffId },
      select: { id: true, area: true },
    });
    const team = await prisma.staff.findMany({
      where: {
        OR: [
          { reportsToId: user.staffId },
          { id: user.staffId },
          ...(me?.area ? [{ area: me.area }] : []),
        ],
      },
      select: { id: true },
    });
    return { assignedStaffId: { in: team.map((t) => t.id) } };
  }

  return { assignedStaffId: user.staffId };
}

export async function canAccessCustomer(user: AuthUser, customerId: string): Promise<boolean> {
  if (can(user, "customer.view_all")) return true;
  const scope = await customerScope(user);
  const found = await prisma.customer.findFirst({
    where: { AND: [{ id: customerId }, scope] },
    select: { id: true },
  });
  return Boolean(found);
}

/** Staff directory visibility. Mirrors the org-tree scope exactly. */
export async function staffScope(user: AuthUser): Promise<Prisma.StaffWhereInput> {
  // Company-wide roles (Super Admin, plain Admin) and payroll need everyone.
  if (user.roleKey === "SUPER_ADMIN" || can(user, "*")) return {};
  if (user.roleKey === "ADMIN" && !user.staffId) return {};
  if (user.roleKey === "ACCOUNTANT") return {};
  if (!user.staffId) return { id: "__none__" };

  const rows = await prisma.staff.findMany({ select: { id: true, reportsToId: true } });
  const ids = Array.from(collectDescendantIds(rows, user.staffId));
  return { id: { in: ids } };
}
