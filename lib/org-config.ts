// Organisation vocabulary shared by server code, seed scripts and clients.

export const DEFAULT_DESIGNATIONS: {
  name: string;
  level: number;
  department: string;
  description?: string;
}[] = [
  { name: "Super Admin", level: 100, department: "Management", description: "Owner / highest authority" },
  { name: "Admin", level: 90, department: "Management", description: "Company administrator" },
  { name: "Manager", level: 80, department: "Management", description: "Business / regional manager" },
  { name: "Area Manager", level: 70, department: "Sales", description: "Area level manager" },
  { name: "Accountant", level: 65, department: "Accounts", description: "Finance & payroll" },
  { name: "Team Leader", level: 60, department: "Field Operations", description: "Leads a field team" },
  { name: "Sales Executive", level: 55, department: "Sales", description: "Customer acquisition" },
  { name: "Field Executive", level: 50, department: "Field Operations", description: "Field operations" },
  {
    name: "Document Collection Executive",
    level: 45,
    department: "Documentation",
    description: "Customer document collection",
  },
  { name: "Installation Staff", level: 40, department: "Installation", description: "Installation team" },
  { name: "Other", level: 30, department: "Management", description: "Other custom role" },
];

/** Legacy / shorthand designation names mapped to canonical ones. */
export const DESIGNATION_ALIASES: Record<string, string> = {
  "R Manager": "Manager",
  "Regional Manager": "Manager",
  "AREA Manager": "Area Manager",
  "Area Manager": "Area Manager",
  "Field Staff": "Field Executive",
  "Field Executive": "Field Executive",
  "Sales Executive": "Sales Executive",
  "Team Leader": "Team Leader",
  "Document Collection Executive": "Document Collection Executive",
  "Installation Staff": "Installation Staff",
  Accountant: "Accountant",
  Admin: "Admin",
  "Super Admin": "Super Admin",
};

export function canonicalDesignation(name: string | null | undefined): string {
  if (!name) return "Other";
  return DESIGNATION_ALIASES[name] ?? name;
}

export function levelOf(designation: string | null | undefined, level?: number | null): number {
  if (typeof level === "number") return level;
  const canonical = canonicalDesignation(designation);
  return DEFAULT_DESIGNATIONS.find((d) => d.name === canonical)?.level ?? 30;
}
