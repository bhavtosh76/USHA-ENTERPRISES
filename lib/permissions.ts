import { ROLE_KEYS } from "./constants";

/**
 * Permission catalogue. `*` grants everything (Super Admin only).
 * Permissions are stored per role as a JSON string array so the owner can
 * change them from Settings without a code deployment.
 */
export const PERMISSIONS = {
  "dashboard.view": "View dashboard",
  "staff.view": "View staff directory & profiles",
  "staff.manage": "Create / edit / disable staff",
  "staff.transfer": "Transfer staff or change reporting manager",
  "attendance.view": "View attendance",
  "attendance.manage": "Mark / edit attendance & approve leaves",
  "payroll.view": "View payroll & salary slips",
  "payroll.manage": "Generate payroll",
  "payroll.approve": "Approve & mark salary paid",
  "customer.view": "View customers",
  "customer.view_all": "View all customers (not just own/team)",
  "customer.create": "Create customers",
  "customer.edit": "Edit customers & update status",
  "customer.delete": "Archive customers",
  "customer.verify_docs": "Verify / reject documents",
  "installation.view": "View installations",
  "installation.manage": "Create / edit installations",
  "finance.view": "View finance & P&L",
  "finance.manage": "Record transactions",
  "subsidy.view": "Use subsidy calculator",
  "subsidy.manage": "Manage subsidy schemes & rates",
  "reports.view": "Export reports",
  "audit.view": "View audit logs & login history",
  "settings.manage": "Manage company settings, roles & users",
  "notification.view": "View notifications",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

const FIELD_STAFF_PERMS: Permission[] = [
  "dashboard.view",
  "customer.view",
  "customer.create",
  "customer.edit",
  "installation.view",
  "subsidy.view",
  "notification.view",
  "staff.view",
];

const TEAM_LEADER_PERMS: Permission[] = [
  ...FIELD_STAFF_PERMS,
  "staff.view",
  "attendance.view",
  "attendance.manage",
  "installation.manage",
  "reports.view",
];

const AREA_MANAGER_PERMS: Permission[] = [
  ...TEAM_LEADER_PERMS,
  "customer.verify_docs",
  "payroll.view",
];

const MANAGER_PERMS: Permission[] = [
  ...AREA_MANAGER_PERMS,
  "staff.manage",
  "staff.transfer",
  "customer.delete",
  "finance.view",
  "subsidy.manage",
  "audit.view",
];

const ACCOUNTANT_PERMS: Permission[] = [
  "dashboard.view",
  "staff.view",
  "attendance.view",
  "payroll.view",
  "payroll.manage",
  "payroll.approve",
  "customer.view",
  "customer.view_all",
  "finance.view",
  "finance.manage",
  "reports.view",
  "notification.view",
];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ["*" as Permission],
  ADMIN: [...ALL_PERMISSIONS],
  MANAGER: MANAGER_PERMS,
  AREA_MANAGER: AREA_MANAGER_PERMS,
  TEAM_LEADER: TEAM_LEADER_PERMS,
  FIELD_STAFF: FIELD_STAFF_PERMS,
  ACCOUNTANT: ACCOUNTANT_PERMS,
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: "Owner account. Full control, cannot be deleted.",
  ADMIN: "Company administrator with every operational permission.",
  MANAGER: "Business manager: staff, CRM, installations, finance view, reports.",
  AREA_MANAGER: "Area level manager with document verification rights.",
  TEAM_LEADER: "Leads a field team, marks attendance, manages installations.",
  FIELD_STAFF: "Field executive: own customers and document collection.",
  ACCOUNTANT: "Finance, payroll and company-wide reporting.",
};

export function parsePermissions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function hasPermission(
  roleKey: string | undefined,
  permissions: string[] | undefined,
  permission: Permission | string,
): boolean {
  if (!roleKey) return false;
  if (roleKey === "SUPER_ADMIN") return true;
  if (!permissions) return false;
  if (permissions.includes("*")) return true;
  return permissions.includes(permission);
}

export const ROLE_KEY_ORDER = ROLE_KEYS as unknown as string[];
