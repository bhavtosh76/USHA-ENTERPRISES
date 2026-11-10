import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { customerUpdateSchema } from "@/lib/validation";
import { canAccessCustomer } from "@/lib/access";
import { can } from "@/lib/auth";
import { CUSTOMER_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { notifyAdmins } from "@/lib/notify";

type Ctx = { params: Promise<Record<string, string>> };

export const PATCH = withApi(async (request, context: Ctx) => {
  const user = await requireApi("customer.edit");
  const { id } = await context.params;
  if (!(await canAccessCustomer(user, id))) throw new HttpError(403, "Aap is customer ko access nahi kar sakte.");

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Customer not found.");

  const input = await parseBody(request, customerUpdateSchema);

  const assignedStaffId = input.assignedStaffId;
  if (!can(user, "customer.view_all") && assignedStaffId && assignedStaffId !== user.staffId) {
    throw new HttpError(403, "Aap customer ko doosre staff ko assign nahi kar sakte.");
  }
  if (input.status && !CUSTOMER_STATUSES.includes(input.status as never)) {
    throw new HttpError(422, "Invalid status.");
  }

  const statusChanged = input.status && input.status !== existing.status;

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      fullName: input.fullName,
      fatherName: input.fatherName,
      dob: input.dob ? new Date(input.dob) : undefined,
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
      applicationDate: input.applicationDate ? new Date(input.applicationDate) : undefined,
      assignedStaffId,
      status: input.status,
      remarks: input.remarks,
      ...(statusChanged
        ? {
            history: {
              create: {
                status: input.status!,
                note: "Status changed while editing customer.",
                changedById: user.id,
              },
            },
          }
        : {}),
    },
  });

  await auditRequest(user, request, "UPDATE", "Customer", id, {
    fields: Object.keys(input),
    statusChanged: statusChanged ? `${existing.status} -> ${input.status}` : undefined,
  });

  if (statusChanged) {
    await notifyAdmins({
      title: "Customer status updated",
      message: `${customer.fullName} (${customer.customerCode}) is now ${STATUS_LABELS[input.status!] || input.status}.`,
      type: "INFO",
      link: `/app/customers/${id}`,
    });
  }

  return json({ ok: true, customer: { id: customer.id } });
});

export const DELETE = withApi(async (request, context: Ctx) => {
  const user = await requireApi("customer.delete");
  const { id } = await context.params;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Customer not found.");

  await prisma.customer.update({ where: { id }, data: { isArchived: true } });
  await auditRequest(user, request, "ARCHIVE", "Customer", id, {
    code: existing.customerCode,
    name: existing.fullName,
  });
  return json({ ok: true });
});
