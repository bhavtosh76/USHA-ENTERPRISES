import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { documentVerifySchema } from "@/lib/validation";
import { canAccessCustomer } from "@/lib/access";
import { DOCUMENT_LABELS, REQUIRED_DOCUMENTS } from "@/lib/constants";
import { notify, notifyAdmins } from "@/lib/notify";
import { can } from "@/lib/auth";
import { deleteStored } from "@/lib/storage";

export const PATCH = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("customer.verify_docs");
  const { id } = await context.params;

  const document = await prisma.customerDocument.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!document) throw new HttpError(404, "Document not found.");
  if (!(await canAccessCustomer(user, document.customerId))) throw new HttpError(403, "Access denied.");

  const input = await parseBody(request, documentVerifySchema);

  const updated = await prisma.customerDocument.update({
    where: { id },
    data: {
      status: input.status,
      notes: input.notes || null,
      extractedName: input.extractedName || null,
      extractedDob: input.extractedDob || null,
      extractedAddress: input.extractedAddress || null,
      verifiedById: input.status === "PENDING" ? null : user.id,
      verifiedAt: input.status === "PENDING" ? null : new Date(),
    },
  });

  let advanced = false;
  if (input.status === "VERIFIED") {
    const docs = await prisma.customerDocument.findMany({
      where: { customerId: document.customerId },
      select: { type: true, status: true },
    });
    const allVerified = REQUIRED_DOCUMENTS.every((required) =>
      docs.some((d) => d.type === required && d.status === "VERIFIED"),
    );
    if (allVerified && ["NEW", "DOCUMENTS_PENDING", "DOCUMENTS_RECEIVED"].includes(document.customer.status)) {
      await prisma.customer.update({
        where: { id: document.customerId },
        data: {
          status: "DOCUMENTS_VERIFIED",
          history: {
            create: {
              status: "DOCUMENTS_VERIFIED",
              note: "All required documents verified.",
              changedById: user.id,
            },
          },
        },
      });
      advanced = true;
    }
  }

  await auditRequest(user, request, input.status === "VERIFIED" ? "VERIFY" : "UPDATE", "CustomerDocument", id, {
    customerId: document.customerId,
    type: document.type,
    status: input.status,
    notes: input.notes,
  });

  if (document.uploadedById && document.uploadedById !== user.id) {
    await notify({
      userId: document.uploadedById,
      title: `Document ${input.status.toLowerCase()}`,
      message: `${DOCUMENT_LABELS[document.type]} for ${document.customer.fullName} was ${input.status.toLowerCase()} by ${user.name}.${input.notes ? ` Note: ${input.notes}` : ""}`,
      type: input.status === "REJECTED" ? "DANGER" : "SUCCESS",
      link: `/app/customers/${document.customerId}`,
    });
  }

  if (input.status === "VERIFIED") {
    await notifyAdmins({
      title: "Document verified",
      message: `${DOCUMENT_LABELS[document.type]} verified for ${document.customer.fullName} (${document.customer.customerCode}).${advanced ? " All required documents complete — status moved to Documents Verified." : ""}`,
      type: "SUCCESS",
      link: `/app/customers/${document.customerId}`,
    });
  }

  return json({ ok: true, document: { id: updated.id, status: updated.status }, advanced });
});

export const DELETE = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("customer.edit");
  const { id } = await context.params;

  const document = await prisma.customerDocument.findUnique({ where: { id } });
  if (!document) throw new HttpError(404, "Document not found.");
  if (!(await canAccessCustomer(user, document.customerId))) throw new HttpError(403, "Access denied.");
  if (document.status === "VERIFIED" && !can(user, "customer.verify_docs")) {
    throw new HttpError(403, "Verified documents can only be removed by a verifier.");
  }

  await deleteStored(document.storedPath);
  await prisma.customerDocument.delete({ where: { id } });

  await auditRequest(user, request, "DELETE", "CustomerDocument", id, {
    customerId: document.customerId,
    type: document.type,
    fileName: document.fileName,
  });

  return json({ ok: true });
});
