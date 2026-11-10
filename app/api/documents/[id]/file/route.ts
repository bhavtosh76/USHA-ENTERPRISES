import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApi, withApi, auditRequest, HttpError } from "@/lib/api";
import { canAccessCustomer } from "@/lib/access";
import { readStored } from "@/lib/storage";

export const GET = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("customer.view");
  const { id } = await context.params;
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";

  const document = await prisma.customerDocument.findUnique({
    where: { id },
    include: { customer: { select: { id: true, fullName: true, customerCode: true } } },
  });
  if (!document) throw new HttpError(404, "Document not found.");
  if (!(await canAccessCustomer(user, document.customerId))) throw new HttpError(403, "Access denied.");

  let buffer: Buffer;
  try {
    buffer = await readStored(document.storedPath);
  } catch {
    throw new HttpError(404, "Stored file is missing. Please re-upload the document.");
  }

  await auditRequest(user, request, download ? "DOWNLOAD" : "VIEW", "CustomerDocument", document.id, {
    customerId: document.customerId,
    customerCode: document.customer.customerCode,
    type: document.type,
    fileName: document.fileName,
  });

  const safeName = document.fileName.replace(/["\r\n]/g, "").slice(0, 150) || "document";
  const encoded = encodeURIComponent(safeName);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
