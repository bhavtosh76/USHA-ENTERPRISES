import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { customerSchema } from "@/lib/validation";
import { nextCustomerCode } from "@/lib/ids";
import { notifyAdmins } from "@/lib/notify";
import { CUSTOMER_STATUSES } from "@/lib/constants";
import { can } from "@/lib/auth";

export const POST = withApi(async (request) => {
  const user = await requireApi("customer.create");
  const input = await parseBody(request, customerSchema);

  if (!CUSTOMER_STATUSES.includes(input.status as never)) {
    throw new HttpError(422, "Invalid customer status.");
  }

  let assignedStaffId = input.assignedStaffId;
  if (!can(user, "customer.view_all")) {
    if (!user.staffId) throw new HttpError(403, "Your account is not linked to a staff profile.");
    if (assignedStaffId && assignedStaffId !== user.staffId) {
      throw new HttpError(403, "Aap sirf apne naam par customer assign kar sakte hain.");
    }
    assignedStaffId = user.staffId;
  }
  if (assignedStaffId) {
    const staff = await prisma.staff.findUnique({ where: { id: assignedStaffId }, select: { id: true, status: true } });
    if (!staff || staff.status !== "ACTIVE") throw new HttpError(422, "Selected staff is not active.");
  }

  const code = await nextCustomerCode();

  const customer = await prisma.customer.create({
    data: {
      customerCode: code,
      fullName: input.fullName,
      fatherName: input.fatherName,
      dob: input.dob ? new Date(input.dob) : null,
      mobile: input.mobile,
      altMobile: input.altMobile,
      state: input.state,
      district: input.district,
      tehsil: input.tehsil,
      village: input.village,
      address: input.address,
      pinCode: input.pinCode,
      consumerNumber: input.consumerNumber,
      discom: input.discom,
      connectionType: input.connectionType,
      sanctionedLoad: input.sanctionedLoad,
      capacityKw: input.capacityKw,
      systemCost: input.systemCost,
      applicationDate: input.applicationDate ? new Date(input.applicationDate) : new Date(),
      assignedStaffId,
      status: input.status || "NEW",
      remarks: input.remarks,
      createdById: user.id,
      history: {
        create: {
          status: input.status || "NEW",
          note: "Customer created.",
          changedById: user.id,
        },
      },
    },
  });

  await auditRequest(user, request, "CREATE", "Customer", customer.id, {
    code,
    name: customer.fullName,
    mobile: customer.mobile,
  });

  await notifyAdmins({
    title: "New customer added",
    message: `${customer.fullName} (${customer.customerCode}) — ${customer.capacityKw} kW, ${customer.village || "village not set"}.`,
    type: "INFO",
    link: `/app/customers/${customer.id}`,
  });

  return json({ ok: true, customer: { id: customer.id, customerCode: customer.customerCode } }, 201);
});
