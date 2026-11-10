// Central domain vocabulary. Keep every enum-like value here so UI, API and
// reports never drift apart.

export const COMPANY = {
  name: "USHA ENTERPRISES",
  tagline: "Solar Panel Installation & Management",
  address:
    "Ghungchai Chauraha, Super Market, Puranpur, Pilibhit, Uttar Pradesh, India",
  district: "Pilibhit",
  state: "Uttar Pradesh",
  phone: "+91 00000 00000",
  email: "info@ushaenterprises.in",
  currency: "INR",
  timezone: "Asia/Kolkata",
} as const;

export const ROLE_KEYS = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "AREA_MANAGER",
  "TEAM_LEADER",
  "FIELD_STAFF",
  "ACCOUNTANT",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  AREA_MANAGER: "Area Manager",
  TEAM_LEADER: "Team Leader",
  FIELD_STAFF: "Field Staff",
  ACCOUNTANT: "Accountant",
};

export const DESIGNATIONS = [
  "R Manager",
  "AREA Manager",
  "Team Leader",
  "Field Executive",
  "Sales Executive",
  "Document Collection Executive",
  "Installation Staff",
  "Accountant",
] as const;

export const DEPARTMENTS = [
  "Management",
  "Sales",
  "Field Operations",
  "Documentation",
  "Installation",
  "Accounts",
] as const;

// ---------------------------------------------------------------- customers
export const CUSTOMER_STATUSES = [
  "NEW",
  "DOCUMENTS_PENDING",
  "DOCUMENTS_RECEIVED",
  "DOCUMENTS_VERIFIED",
  "APPLICATION_SUBMITTED",
  "UNDER_PROCESS",
  "APPROVED",
  "INSTALLATION_PENDING",
  "INSTALLATION_COMPLETED",
  "SUBSIDY_PENDING",
  "SUBSIDY_RECEIVED",
  "REJECTED",
] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New Customer",
  DOCUMENTS_PENDING: "Documents Pending",
  DOCUMENTS_RECEIVED: "Documents Received",
  DOCUMENTS_VERIFIED: "Documents Verified",
  APPLICATION_SUBMITTED: "Application Submitted",
  UNDER_PROCESS: "Application Under Process",
  APPROVED: "Application Approved",
  INSTALLATION_PENDING: "Installation Pending",
  INSTALLATION_COMPLETED: "Installation Completed",
  SUBSIDY_PENDING: "Subsidy Pending",
  SUBSIDY_RECEIVED: "Subsidy Received",
  REJECTED: "Application Rejected",
};

export const STATUS_TONES: Record<
  string,
  "neutral" | "info" | "warning" | "success" | "danger" | "brand"
> = {
  NEW: "brand",
  DOCUMENTS_PENDING: "warning",
  DOCUMENTS_RECEIVED: "info",
  DOCUMENTS_VERIFIED: "info",
  APPLICATION_SUBMITTED: "info",
  UNDER_PROCESS: "warning",
  APPROVED: "success",
  INSTALLATION_PENDING: "warning",
  INSTALLATION_COMPLETED: "success",
  SUBSIDY_PENDING: "warning",
  SUBSIDY_RECEIVED: "success",
  REJECTED: "danger",
};

export const DOCUMENT_TYPES = [
  "AADHAAR",
  "PAN",
  "ELECTRICITY_BILL",
  "BANK_PASSBOOK",
  "PHOTO",
  "OTHER",
] as const;

export const DOCUMENT_LABELS: Record<string, string> = {
  AADHAAR: "Aadhaar Card",
  PAN: "PAN Card",
  ELECTRICITY_BILL: "Electricity Bill",
  BANK_PASSBOOK: "Bank Passbook / Cancelled Cheque",
  PHOTO: "Customer Photograph",
  OTHER: "Other Document",
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Verification",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const REQUIRED_DOCUMENTS = [
  "AADHAAR",
  "ELECTRICITY_BILL",
  "BANK_PASSBOOK",
  "PHOTO",
] as const;

export const DISCOMS = ["MVVNL", "PVVNL", "DVVNL", "PuVVNL", "Other"] as const;

export const CONNECTION_TYPES = ["DOMESTIC", "COMMERCIAL", "AGRICULTURAL"] as const;

// ---------------------------------------------------------------- attendance
export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "PAID_LEAVE",
  "UNPAID_LEAVE",
  "HOLIDAY",
] as const;

export const ATTENDANCE_LABELS: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  PAID_LEAVE: "Paid Leave",
  UNPAID_LEAVE: "Unpaid Leave",
  HOLIDAY: "Holiday",
};

export const LEAVE_TYPES = ["PAID", "UNPAID", "SICK", "CASUAL"] as const;

// ---------------------------------------------------------------- finance
export const INCOME_CATEGORIES = [
  "CUSTOMER_PAYMENT",
  "SUBSIDY",
  "ADVANCE",
  "OTHER",
] as const;

export const EXPENSE_CATEGORIES = [
  "SALARY",
  "OFFICE",
  "INSTALLATION",
  "MARKETING",
  "TRAVEL",
  "PURCHASE",
  "OTHER",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  CUSTOMER_PAYMENT: "Customer Payment",
  SUBSIDY: "Subsidy Received",
  ADVANCE: "Advance Received",
  OTHER: "Other Income",
  SALARY: "Staff Salary",
  OFFICE: "Office Expense",
  INSTALLATION: "Installation Expense",
  MARKETING: "Marketing",
  TRAVEL: "Travel",
  PURCHASE: "Material Purchase",
};

export const PAYMENT_MODES = ["CASH", "BANK", "UPI", "CHEQUE"] as const;

export const INSTALLATION_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export const INSPECTION_STATUSES = ["PENDING", "SCHEDULED", "PASSED", "FAILED"] as const;

export const NET_METER_STATUSES = ["PENDING", "APPLIED", "INSTALLED", "APPROVED"] as const;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
