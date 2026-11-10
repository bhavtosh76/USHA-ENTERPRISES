import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { installationSchema } from "@/lib/validation";
import { canAccessCustomer } from "@/lib/access";
import { notifyAdmins } from "@/lib/notify";
import { STATUS_LABELS } from "@/lib/constants";

export const POST = withApi(async (request) => {
  const user = await requireApi("installation.manage");
  const input = await parseBody(request, installationSchema);

  if (!(await canAccessCustomer(user, input.customerId))) {
    throw new HttpError(404, "Customer not found or not accessible.");
  }
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    select: { id: true, fullName: true, customerCode: true, status: true, capacityKw: true },
  });
  if (!customer) throw new HttpError(404, "Customer not found.");

  const data = {
    capacityKw: input.capacityKw || customer.capacityKw,
    installationDate: input.installationDate ? new Date(input.installationDate) : null,
    teamLeadId: input.teamLeadId,
    teamMembers: input.teamMembers,
    inverterBrand: input.inverterBrand,
    inverterModel: input.inverterModel,
    inverterSerial: input.inverterSerial,
    panelBrand: input.panelBrand,
    panelModel: input.panelModel,
    panelCount: input.panelCount ?? null,
    panelSerials: input.panelSerials,
    inspectionStatus: input.inspectionStatus,
    inspectionDate: input.inspectionDate ? new Date(input.inspectionDate) : null,
    netMeterStatus: input.netMeterStatus,
    netMeterDate: input.netMeterDate ? new Date(input.netMeterDate) : null,
    completionStatus: input.completionStatus,
    remarks: input.remarks,
  };

  const installation = await prisma.installation.upsert({
    where: { customerId: input.customerId },
    create: { customerId: input.customerId, ...data },
    update: data,
  });

  // Keep customer lifecycle in sync with field reality (explicit, auditable).
  let newStatus: string | null = null;
  if (input.completionStatus === "COMPLETED" && ["APPROVED", "INSTALLATION_PENDING"].includes(customer.status)) {
    newStatus = "INSTALLATION_COMPLETED";
  } else if (input.netMeterStatus === "APPROVED" && customer.status === "INSTALLATION_COMPLETED") {
    newStatus = "SUBSIDY_PENDING";
  }
  if (newStatus) {
    await prisma.customer.update({ where: { id: customer.id }, data: { status: newStatus } });
    await prisma.applicationHistory.create({
      data: {
        customerId: customer.id,
        status: newStatus,
        note: `Installation update se status automatically badla: ${STATUS_LABELS[newStatus] || newStatus}.`,
        changedById: user.id,
      },
    });
    await notifyAdmins({
      title: "Installation updated",
      message: `${customer.fullName} (${customer.customerCode}) ab ${STATUS_LABELS[newStatus] || newStatus} stage par hai.`,
      type: "SUCCESS",
      link: `/app/customers/${customer.id}`,
    });
  }

  await auditRequest(user, request, "UPDATE", "Installation", installation.id, {
    customerId: customer.id,
    completionStatus: input.completionStatus,
    netMeterStatus: input.netMeterStatus,
    inspectionStatus: input.inspectionStatus,
    autoStatus: newStatus,
  });

  return json({ ok: true, id: installation.id, customerStatus: newStatus || customer.status });
});
