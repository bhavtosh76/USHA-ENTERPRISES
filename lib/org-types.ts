// Shared organisation-tree types (safe to import from client components).

export type OrgNode = {
  id: string;
  employeeId: string;
  fullName: string;
  photoUrl: string | null;
  designation: string;
  designationLevel: number;
  designationId: string | null;
  department: string | null;
  status: string;
  joiningDate: string;
  area: string | null;
  mobile: string | null;
  email: string | null;
  roleKey: string | null;
  roleName: string | null;
  managerId: string | null;
  managerName: string | null;
  directCount: number;
  totalCount: number;
  customers: number;
  isSelf: boolean;
  children: OrgNode[];
};

export type OrgTree = {
  roots: OrgNode[];
  flat: OrgNode[];
  total: number;
  access: { all: boolean; canManage: boolean; canTransfer: boolean; selfId: string | null };
  viewer: { id: string; name: string; roleKey: string; designation: string | null };
};

export type OrgStats = {
  totalAdmins: number;
  totalManagers: number;
  totalAreaManagers: number;
  totalTeamLeaders: number;
  totalFieldStaff: number;
  activeEmployees: number;
  inactiveEmployees: number;
  totalStrength: number;
  customers: number;
  applicationsSubmitted: number;
  pendingDocuments: number;
  approvedCustomers: number;
  installationsCompleted: number;
};

export type DesignationOption = {
  id: string;
  name: string;
  level: number;
  description: string | null;
  isSystem: boolean;
  department: { name: string } | null;
};
