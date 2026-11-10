import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : null));

const mobile = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid 10 digit mobile number");

const numberish = z.coerce.number().min(0).max(100000000);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email daalein."),
  password: z.string().min(6, "Password kam se kam 6 characters ka hona chahiye."),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters.")
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email daalein."),
});

export const resetRequestActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("RESOLVE"),
    password: z
      .string()
      .min(8, "New password must be at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("DISMISS"),
    note: z.string().trim().max(500).optional(),
  }),
]);

export const staffSchema = z.object({
  fullName: z.string().trim().min(3, "Full name required."),
  mobile,
  altMobile: optionalText,
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")).transform((v) => v || null),
  address: optionalText,
  joiningDate: z.string().min(1, "Joining date required."),
  designation: z.string().min(1, "Designation required."),
  department: optionalText,
  monthlySalary: numberish,
  bankName: optionalText,
  bankAccount: optionalText,
  bankIfsc: optionalText,
  targetMonthly: numberish.default(0),
  incentiveRate: z.coerce.number().min(0).max(100).default(0),
  commissionRate: z.coerce.number().min(0).max(100).default(0),
  area: optionalText,
  reportsToId: z.string().optional().nullable().transform((v) => v || null),
  status: z.enum(["ACTIVE", "INACTIVE", "TERMINATED"]).default("ACTIVE"),
  notes: optionalText,
  roleKey: z.string().min(1).default("FIELD_STAFF"),
  password: z.string().min(8).optional().or(z.literal("")).transform((v) => v || null),
});

export const staffUpdateSchema = z.object({
  fullName: z.string().trim().min(3).optional(),
  mobile: mobile.optional(),
  altMobile: optionalText,
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")).transform((v) => v || null),
  address: optionalText,
  joiningDate: z.string().optional(),
  designation: z.string().optional(),
  department: optionalText,
  monthlySalary: z.coerce.number().min(0).optional(),
  bankName: optionalText,
  bankAccount: optionalText,
  bankIfsc: optionalText,
  targetMonthly: z.coerce.number().min(0).optional(),
  incentiveRate: z.coerce.number().min(0).max(100).optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  area: optionalText,
  reportsToId: z.string().optional().nullable().transform((v) => v || null),
  status: z.enum(["ACTIVE", "INACTIVE", "TERMINATED"]).optional(),
  notes: optionalText,
  roleKey: z.string().optional(),
  password: z.string().min(8).optional().or(z.literal("")).transform((v) => v || null),
});

export const customerSchema = z.object({
  fullName: z.string().trim().min(3, "Customer name required."),
  fatherName: optionalText,
  dob: z.string().optional().or(z.literal("")).transform((v) => v || null),
  mobile,
  altMobile: optionalText,
  state: z.string().trim().default("Uttar Pradesh"),
  district: z.string().trim().default("Pilibhit"),
  tehsil: optionalText,
  village: optionalText,
  address: optionalText,
  pinCode: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, "PIN code 6 digits ka hona chahiye.")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  consumerNumber: optionalText,
  discom: optionalText,
  connectionType: optionalText,
  sanctionedLoad: optionalText,
  capacityKw: z.coerce.number().min(0).max(1000).default(0),
  systemCost: z.coerce.number().min(0).max(100000000).default(0),
  applicationDate: z.string().optional(),
  assignedStaffId: z.string().optional().nullable().transform((v) => v || null),
  status: z.string().default("NEW"),
  remarks: optionalText,
});

export const customerUpdateSchema = customerSchema.partial();

export const statusUpdateSchema = z.object({
  status: z.string().min(1),
  note: z.string().trim().max(500).optional(),
});

export const documentVerifySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "PENDING"]),
  notes: z.string().trim().max(500).optional(),
  extractedName: z.string().trim().max(120).optional(),
  extractedDob: z.string().trim().max(30).optional(),
  extractedAddress: z.string().trim().max(300).optional(),
});

export const attendanceSchema = z.object({
  date: z.string().min(1),
  entries: z
    .array(
      z.object({
        staffId: z.string().min(1),
        status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "PAID_LEAVE", "UNPAID_LEAVE", "HOLIDAY"]),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        overtimeHours: z.coerce.number().min(0).max(24).default(0),
        note: z.string().max(200).optional(),
      }),
    )
    .min(1),
});

export const leaveSchema = z.object({
  staffId: z.string().min(1),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  type: z.enum(["PAID", "UNPAID", "SICK", "CASUAL"]),
  reason: z.string().trim().max(500).optional(),
});

export const leaveDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const payrollGenerateSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  staffId: z.string().optional().nullable(),
  workingDays: z.coerce.number().min(1).max(31).default(26),
  overtimeRatePerHour: z.coerce.number().min(0).default(0),
});

export const payrollDecisionSchema = z.object({
  action: z.enum(["APPROVE", "PAY", "REOPEN", "EDIT"]),
  paymentMode: z.enum(["CASH", "BANK", "UPI", "CHEQUE"]).optional(),
  reference: z.string().trim().max(120).optional(),
  advance: z.coerce.number().min(0).optional(),
  otherDeduction: z.coerce.number().min(0).optional(),
  incentive: z.coerce.number().min(0).optional(),
  commission: z.coerce.number().min(0).optional(),
  remarks: z.string().trim().max(500).optional(),
});

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1),
  amount: z.coerce.number().positive("Amount 0 se zyada hona chahiye."),
  date: z.string().min(1),
  description: z.string().trim().max(500).optional(),
  reference: z.string().trim().max(120).optional(),
  paymentMode: z.enum(["CASH", "BANK", "UPI", "CHEQUE"]).default("CASH"),
  customerId: z.string().optional().nullable().transform((v) => v || null),
  staffId: z.string().optional().nullable().transform((v) => v || null),
});

export const schemeSchema = z.object({
  name: z.string().trim().min(3),
  schemeCode: z.string().trim().min(2).regex(/^[A-Z0-9_-]+$/, "Use CAPS, numbers, - or _"),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional().or(z.literal("")).transform((v) => v || null),
  state: z.string().trim().default("ALL"),
  discom: optionalText,
  capacityMinKw: z.coerce.number().min(0),
  capacityMaxKw: z.coerce.number().positive(),
  centralRatePerKw: z.coerce.number().min(0),
  stateRatePerKw: z.coerce.number().min(0),
  maxSubsidy: z.coerce.number().min(0),
  eligibility: optionalText,
  sourceUrl: optionalText,
  notes: optionalText,
  isActive: z.coerce.boolean().default(true),
});

export const installationSchema = z.object({
  customerId: z.string().min(1),
  capacityKw: z.coerce.number().min(0).default(0),
  installationDate: z.string().optional().or(z.literal("")).transform((v) => v || null),
  teamLeadId: z.string().optional().nullable().transform((v) => v || null),
  teamMembers: optionalText,
  inverterBrand: optionalText,
  inverterModel: optionalText,
  inverterSerial: optionalText,
  panelBrand: optionalText,
  panelModel: optionalText,
  panelCount: z.coerce.number().int().min(0).optional().nullable(),
  panelSerials: optionalText,
  inspectionStatus: z.enum(["PENDING", "SCHEDULED", "PASSED", "FAILED"]).default("PENDING"),
  inspectionDate: z.string().optional().or(z.literal("")).transform((v) => v || null),
  netMeterStatus: z.enum(["PENDING", "APPLIED", "INSTALLED", "APPROVED"]).default("PENDING"),
  netMeterDate: z.string().optional().or(z.literal("")).transform((v) => v || null),
  completionStatus: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).default("PENDING"),
  remarks: optionalText,
});

export const settingsSchema = z.object({
  company_name: z.string().trim().min(2),
  company_address: z.string().trim().min(5),
  company_phone: z.string().trim().min(6),
  company_email: z.string().trim().email(),
  company_gst: z.string().trim().max(20).optional().default(""),
  company_signatory: z.string().trim().max(80).optional().default(""),
  subsidy_disclaimer: z.string().trim().max(600).optional().default(""),
  default_working_days: z.coerce.number().min(1).max(31).default(26),
  overtime_rate: z.coerce.number().min(0).default(0),
  notify_email: z.string().trim().max(120).optional().default(""),
  notify_whatsapp: z.string().trim().max(20).optional().default(""),
});

export const userSchema = z.object({
  name: z.string().trim().min(3),
  email: z.string().trim().toLowerCase().email(),
  roleKey: z.string().min(1),
  password: z.string().min(8),
  isActive: z.coerce.boolean().default(true),
});

export const roleUpdateSchema = z.object({
  permissions: z.array(z.string()),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(3).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  roleKey: z.string().min(1).optional(),
  isActive: z.coerce.boolean().optional(),
  password: z.string().min(8).optional(),
  mustChangePassword: z.coerce.boolean().optional(),
});

export const subsidyCalcSchema = z.object({
  capacityKw: z.coerce.number().min(0.5).max(1000),
  state: z.string().trim().default("Uttar Pradesh"),
  discom: z.string().trim().optional(),
  systemCostPerKw: z.coerce.number().min(0).default(0),
  customerId: z.string().optional().nullable(),
});

export const documentCheckSchema = z.object({
  fullName: z.string().trim().min(1),
  fatherName: z.string().trim().optional(),
  dob: z.string().trim().optional(),
  address: z.string().trim().optional(),
});
