import { prisma } from "@/lib/db";
import { requireApi, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { canAccessCustomer } from "@/lib/access";
import { saveUpload } from "@/lib/storage";
import { DOCUMENT_LABELS, DOCUMENT_TYPES } from "@/lib/constants";
import { notifyAdmins } from "@/lib/notify";

export const POST = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("customer.edit");
  const { id } = await context.params;
  if (!(await canAccessCustomer(user, id))) throw new HttpError(403, "Access denied.");

  const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true, fullName: true, customerCode: true, status: true } });
  if (!customer) throw new HttpError(404, "Customer not found.");

  const form = await request.formData();
  const type = String(form.get("type") || "");
  const file = form.get("file");
  if (!DOCUMENT_TYPES.includes(type as never)) throw new HttpError(422, "Please select a valid document type.");
  if (!(file instanceof File)) throw new HttpError(422, "Please choose a file to upload.");

  let saved;
  try {
    saved = await saveUpload(file, `customers/${id}`);
  } catch (error) {
    throw new HttpError(422, error instanceof Error ? error.message : "Upload failed.");
  }

  const document = await prisma.customerDocument.create({
    data: {
      customerId: id,
      type,
      fileName: saved.fileName,
      storedPath: saved.storedPath,
      mimeType: saved.mimeType,
      size: saved.size,
      uploadedById: user.id,
    },
  });

  // Automation: first document upload moves the application forward.
  if (["NEW", "DOCUMENTS_PENDING"].includes(customer.status)) {
    await prisma.customer.update({
      where: { id },
      data: {
        status: "DOCUMENTS_RECEIVED",
        history: {
          create: {
            status: "DOCUMENTS_RECEIVED",
            note: `${DOCUMENT_LABELS[type]} uploaded.`,
            changedById: user.id,
          },
        },
      },
    });
  }

  await auditRequest(user, request, "UPLOAD", "CustomerDocument", document.id, {
    customerId: id,
    customerCode: customer.customerCode,
    type,
    fileName: saved.fileName,
    size: saved.size,
  });

  await notifyAdmins({
    title: "Document uploaded",
    message: `${DOCUMENT_LABELS[type]} uploaded for ${customer.fullName} (${customer.customerCode}) by ${user.name}. Verification pending.`,
    type: "INFO",
    link: `/app/customers/${id}`,
  });

  return json({ ok: true, document: { id: document.id } }, 201);
});
