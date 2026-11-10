import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { statusUpdateSchema } from "@/lib/validation";
import { canAccessCustomer } from "@/lib/access";
import { CUSTOMER_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { notify, notifyAdmins } from "@/lib/notify";

export const POST = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("customer.edit");
  const { id } = await context.params;
  if (!(await canAccessCustomer(user, id))) throw new HttpError(403, "Access denied.");

  const input = await parseBody(request, statusUpdateSchema);
  if (!CUSTOMER_STATUSES.includes(input.status as never)) throw new HttpError(422, "Invalid status.");

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new HttpError(404, "Customer not found.");
  if (customer.status === input.status) {
    return json({ ok: true, unchanged: true });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.customer.update({
      where: { id },
      data: {
        status: input.status,
        history: {
          create: {
            status: input.status,
            note: input.note || null,
            changedById: user.id,
          },
        },
      },
    });

    // Automation: keep installation record in sync with lifecycle stages.
    if (input.status === "INSTALLATION_COMPLETED") {
      await tx.installation.upsert({
        where: { customerId: id },
        create: {
          customerId: id,
          capacityKw: customer.capacityKw,
          completionStatus: "COMPLETED",
          installationDate: new Date(),
        },
        update: { completionStatus: "COMPLETED" },
      });
    }
    return c;
  });

  await auditRequest(user, request, "STATUS_CHANGE", "Customer", id, {
    from: customer.status,
    to: input.status,
    note: input.note,
  });

  await notifyAdmins({
    title: "Customer status updated",
    message: `${updated.fullName} (${updated.customerCode}): ${STATUS_LABELS[customer.status] || customer.status} → ${STATUS_LABELS[input.status] || input.status}.`,
    type: input.status === "REJECTED" ? "DANGER" : input.status === "SUBSIDY_RECEIVED" ? "SUCCESS" : "INFO",
    link: `/app/customers/${id}`,
  });

  if (customer.assignedStaffId) {
    const staff = await prisma.staff.findUnique({
      where: { id: customer.assignedStaffId },
      select: { userId: true },
    });
    if (staff?.userId) {
      await notify({
        userId: staff.userId,
        title: "Customer status updated",
        message: `${updated.fullName} is now ${STATUS_LABELS[input.status] || input.status}.`,
        type: "INFO",
        link: `/app/customers/${id}`,
      });
    }
  }

  return json({ ok: true, status: updated.status });
});
