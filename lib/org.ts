import "server-only";
import { prisma } from "./db";
import { can, type AuthUser } from "./auth";
import { canonicalDesignation, levelOf } from "./org-config";
import type { OrgNode, OrgTree, OrgStats } from "./org-types";

/**
 * Organisation hierarchy helpers.
 *
 * The tree is built from real Staff.reportsToId relationships. Visibility is
 * enforced here (server-side) and again in every API route:
 *   - SUPER_ADMIN                     -> entire company
 *   - ADMIN without a staff profile   -> entire company
 *   - everyone else with a staff row  -> self + all descendants
 */

export { canonicalDesignation, levelOf } from "./org-config";

type ScopeRow = { id: string; reportsToId: string | null };

export type OrgAccess = {
  /** true = every employee in the company is visible. */
  all: boolean;
  /** Visible staff ids (null when `all` is true). */
  ids: Set<string> | null;
  selfId: string | null;
  canManage: boolean;
  canTransfer: boolean;
};

/** Unrestricted (company-wide) visibility for this actor. */
export function hasCompanyWideScope(user: AuthUser): boolean {
  if (user.roleKey === "SUPER_ADMIN") return true;
  if (can(user, "*")) return true;
  // A plain Admin account without its own staff profile administers the company.
  if (user.roleKey === "ADMIN" && !user.staffId) return true;
  return false;
}

export function collectDescendantIds(rows: ScopeRow[], rootId: string): Set<string> {
  const byParent = new Map<string, ScopeRow[]>();
  for (const row of rows) {
    if (!row.reportsToId) continue;
    const list = byParent.get(row.reportsToId) ?? [];
    list.push(row);
    byParent.set(row.reportsToId, list);
  }
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const child of byParent.get(id) ?? []) {
      if (!out.has(child.id)) stack.push(child.id);
    }
  }
  return out;
}

/** True when `candidateId` is inside `ancestorId`'s subtree (inclusive). */
export function isInSubtree(rows: ScopeRow[], ancestorId: string, candidateId: string): boolean {
  if (ancestorId === candidateId) return true;
  return collectDescendantIds(rows, ancestorId).has(candidateId);
}

export async function getOrgAccess(user: AuthUser): Promise<OrgAccess> {
  const canManage = can(user, "staff.manage");
  const canTransfer = can(user, "staff.transfer") || canManage;

  if (hasCompanyWideScope(user)) {
    return { all: true, ids: null, selfId: user.staffId, canManage, canTransfer };
  }
  if (!user.staffId) {
    return { all: false, ids: new Set(), selfId: null, canManage, canTransfer };
  }
  const rows = await prisma.staff.findMany({ select: { id: true, reportsToId: true } });
  return {
    all: false,
    ids: collectDescendantIds(rows, user.staffId),
    selfId: user.staffId,
    canManage,
    canTransfer,
  };
}

/** Staff ids the actor is allowed to see (null = all). */
export async function visibleStaffIds(user: AuthUser): Promise<Set<string> | null> {
  return (await getOrgAccess(user)).ids;
}

/** Throws unless the actor may view this staff member. */
export async function canViewStaff(user: AuthUser, staffId: string): Promise<boolean> {
  const access = await getOrgAccess(user);
  return access.all || Boolean(access.ids?.has(staffId));
}

/** Throws unless the actor may manage this staff member. */
export async function canManageStaff(user: AuthUser, staffId: string): Promise<boolean> {
  const access = await getOrgAccess(user);
  if (!access.canManage) return false;
  return access.all || Boolean(access.ids?.has(staffId));
}

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

export type { OrgNode, OrgTree, OrgStats } from "./org-types";

type StaffRow = {
  id: string;
  employeeId: string;
  fullName: string;
  photoPath: string | null;
  designation: string;
  designationId: string | null;
  status: string;
  joiningDate: Date;
  reportsToId: string | null;
  area: string | null;
  mobile: string;
  email: string | null;
  department: string | null;
  designationRef: { name: string; level: number } | null;
  user: { id: string; role: { key: string; name: string } } | null;
  _count: { customers: number };
};

export async function getOrgTree(user: AuthUser): Promise<OrgTree> {
  const access = await getOrgAccess(user);

  const rows = (await prisma.staff.findMany({
    orderBy: [{ joiningDate: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      employeeId: true,
      fullName: true,
      photoPath: true,
      designation: true,
      designationId: true,
      status: true,
      joiningDate: true,
      reportsToId: true,
      area: true,
      mobile: true,
      email: true,
      department: true,
      designationRef: { select: { name: true, level: true } },
      user: { select: { id: true, role: { select: { key: true, name: true } } } },
      _count: { select: { customers: true } },
    },
  })) as StaffRow[];

  const visible = access.all ? rows : rows.filter((r) => access.ids?.has(r.id));
  const visibleIds = new Set(visible.map((r) => r.id));
  const nameById = new Map(visible.map((r) => [r.id, r.fullName]));
  const showContact = access.canManage || user.roleKey === "SUPER_ADMIN" || user.roleKey === "ADMIN";

  const nodeById = new Map<string, OrgNode>();
  for (const row of visible) {
    const designation = canonicalDesignation(row.designationRef?.name ?? row.designation);
    const isSelf = row.id === user.staffId;
    nodeById.set(row.id, {
      id: row.id,
      employeeId: row.employeeId,
      fullName: row.fullName,
      photoUrl: row.photoPath ? `/api/staff/${row.id}/photo` : null,
      designation,
      designationLevel: levelOf(designation, row.designationRef?.level),
      designationId: row.designationId,
      department: row.department,
      status: row.status,
      joiningDate: row.joiningDate.toISOString(),
      area: row.area,
      mobile: showContact || isSelf ? row.mobile : null,
      email: showContact || isSelf ? row.email : null,
      roleKey: row.user?.role.key ?? null,
      roleName: row.user?.role.name ?? null,
      managerId: row.reportsToId && visibleIds.has(row.reportsToId) ? row.reportsToId : null,
      managerName: row.reportsToId ? nameById.get(row.reportsToId) ?? null : null,
      directCount: 0,
      totalCount: 0,
      customers: row._count.customers,
      isSelf,
      children: [],
    });
  }

  const roots: OrgNode[] = [];
  for (const row of visible) {
    const node = nodeById.get(row.id)!;
    const parent = row.reportsToId ? nodeById.get(row.reportsToId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortNodes = (list: OrgNode[]) => {
    list.sort(
      (a, b) =>
        b.designationLevel - a.designationLevel ||
        a.fullName.localeCompare(b.fullName, "en-IN"),
    );
    for (const n of list) sortNodes(n.children);
  };
  sortNodes(roots);

  const flat: OrgNode[] = [];
  const computeCounts = (node: OrgNode): number => {
    flat.push(node);
    node.directCount = node.children.length;
    let total = node.children.length;
    for (const child of node.children) total += computeCounts(child);
    node.totalCount = total;
    return total;
  };
  for (const root of roots) computeCounts(root);

  return {
    roots,
    flat,
    total: visible.length,
    access: {
      all: access.all,
      canManage: access.canManage,
      canTransfer: access.canTransfer,
      selfId: access.selfId,
    },
    viewer: {
      id: user.id,
      name: user.name,
      roleKey: user.roleKey,
      designation: user.designation,
    },
  };
}

// ---------------------------------------------------------------------------
// Dashboard statistics
// ---------------------------------------------------------------------------

const APPLICATION_STATUSES = [
  "APPLICATION_SUBMITTED",
  "UNDER_PROCESS",
  "APPROVED",
  "INSTALLATION_PENDING",
  "INSTALLATION_COMPLETED",
  "SUBSIDY_PENDING",
  "SUBSIDY_RECEIVED",
];

const APPROVED_STATUSES = [
  "APPROVED",
  "INSTALLATION_PENDING",
  "INSTALLATION_COMPLETED",
  "SUBSIDY_PENDING",
  "SUBSIDY_RECEIVED",
];

export async function getOrgStats(user: AuthUser): Promise<OrgStats> {
  const access = await getOrgAccess(user);
  const ids = access.all ? null : Array.from(access.ids ?? []);

  const staffWhere = ids ? { id: { in: ids } } : {};
  const customerWhere = ids
    ? { assignedStaffId: { in: ids }, isArchived: false }
    : { isArchived: false };

  const staff = await prisma.staff.findMany({
    where: staffWhere,
    select: {
      status: true,
      designation: true,
      designationRef: { select: { name: true } },
      user: { select: { role: { select: { key: true } } } },
    },
  });

  const countBy = (predicate: (s: (typeof staff)[number]) => boolean) =>
    staff.filter(predicate).length;

  const designationName = (s: (typeof staff)[number]) =>
    canonicalDesignation(s.designationRef?.name ?? s.designation);

  const [customers, applicationsSubmitted, pendingDocuments, approvedCustomers, installationsCompleted] =
    await Promise.all([
      prisma.customer.count({ where: customerWhere }),
      prisma.customer.count({ where: { ...customerWhere, status: { in: APPLICATION_STATUSES } } }),
      prisma.customerDocument.count({
        where: { status: "PENDING", customer: customerWhere },
      }),
      prisma.customer.count({ where: { ...customerWhere, status: { in: APPROVED_STATUSES } } }),
      prisma.installation.count({
        where: { completionStatus: "COMPLETED", customer: customerWhere },
      }),
    ]);

  return {
    totalAdmins: countBy(
      (s) => designationName(s) === "Admin" || s.user?.role.key === "ADMIN",
    ),
    totalManagers: countBy((s) => designationName(s) === "Manager"),
    totalAreaManagers: countBy((s) => designationName(s) === "Area Manager"),
    totalTeamLeaders: countBy((s) => designationName(s) === "Team Leader"),
    totalFieldStaff: countBy(
      (s) => levelOf(designationName(s), null) < 60 && s.user?.role.key !== "ACCOUNTANT",
    ),
    activeEmployees: countBy((s) => s.status === "ACTIVE"),
    inactiveEmployees: countBy((s) => s.status !== "ACTIVE"),
    totalStrength: staff.length,
    customers,
    applicationsSubmitted,
    pendingDocuments,
    approvedCustomers,
    installationsCompleted,
  };
}
