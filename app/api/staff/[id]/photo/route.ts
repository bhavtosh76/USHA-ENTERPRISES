import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApi, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { readStored, saveUpload, deleteStored } from "@/lib/storage";
import { can } from "@/lib/auth";

type Ctx = { params: Promise<Record<string, string>> };

export const POST = withApi(async (request, context: Ctx) => {
  const user = await requireApi();
  const { id } = await context.params;
  if (!can(user, "staff.manage") && user.staffId !== id) throw new HttpError(403, "Access denied.");

  const staff = await prisma.staff.findUnique({ where: { id }, select: { id: true, photoPath: true, employeeId: true } });
  if (!staff) throw new HttpError(404, "Staff not found.");

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) throw new HttpError(422, "Please choose a photo.");

  let saved;
  try {
    saved = await saveUpload(file, `staff/${id}`);
  } catch (error) {
    throw new HttpError(422, error instanceof Error ? error.message : "Upload failed.");
  }

  if (staff.photoPath) await deleteStored(staff.photoPath);
  await prisma.staff.update({ where: { id }, data: { photoPath: saved.storedPath } });
  await auditRequest(user, request, "UPLOAD", "StaffPhoto", id, { employeeId: staff.employeeId });

  return json({ ok: true });
});

export const GET = withApi(async (request, context: Ctx) => {
  const user = await requireApi();
  const { id } = await context.params;
  if (!can(user, "staff.view") && user.staffId !== id) throw new HttpError(403, "Access denied.");

  const staff = await prisma.staff.findUnique({ where: { id }, select: { photoPath: true } });
  if (!staff?.photoPath) throw new HttpError(404, "No photo uploaded.");

  let buffer: Buffer;
  try {
    buffer = await readStored(staff.photoPath);
  } catch {
    throw new HttpError(404, "Photo file missing.");
  }

  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": isPng ? "image/png" : "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
