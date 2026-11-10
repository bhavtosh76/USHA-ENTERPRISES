import "server-only";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "./db";

const ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "storage", "uploads");

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Local disk works for a self-hosted server. Serverless hosts (Firebase,
// Cloud Run) have an ephemeral filesystem, so production uses STORAGE_DRIVER=db
// and keeps the bytes in PostgreSQL instead.
const DRIVER = process.env.STORAGE_DRIVER === "db" ? "db" : "local";
const DB_PREFIX = "db:";

const ALLOWED: Record<string, { ext: string; magic: number[][] }> = {
  "application/pdf": { ext: ".pdf", magic: [[0x25, 0x50, 0x44, 0x46]] },
  "image/jpeg": { ext: ".jpg", magic: [[0xff, 0xd8, 0xff]] },
  "image/png": { ext: ".png", magic: [[0x89, 0x50, 0x4e, 0x47]] },
};

export type SavedFile = {
  storedPath: string;
  fileName: string;
  mimeType: string;
  size: number;
};

function matchesMagic(buffer: Buffer, signatures: number[][]): boolean {
  return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

export async function saveUpload(file: File, folder: string): Promise<SavedFile> {
  if (!file || typeof file === "string") throw new Error("No file uploaded.");
  if (file.size <= 0) throw new Error("Uploaded file is empty.");
  if (file.size > MAX_SIZE) throw new Error("File too large. Maximum allowed size is 5 MB.");

  const type = ALLOWED[file.type];
  if (!type) throw new Error("Only PDF, JPG, JPEG and PNG files are allowed.");

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesMagic(buffer, type.magic)) {
    throw new Error("File content does not match its extension. Please upload a genuine PDF/JPG/PNG.");
  }

  if (DRIVER === "db") {
    const row = await prisma.storedFile.create({
      data: { data: buffer, mimeType: file.type, size: file.size },
      select: { id: true },
    });
    return {
      storedPath: `${DB_PREFIX}${row.id}`,
      fileName: file.name.slice(0, 180),
      mimeType: file.type,
      size: file.size,
    };
  }

  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "");
  const dir = path.join(ROOT, safeFolder);
  await mkdir(dir, { recursive: true });

  const storedName = `${Date.now()}-${crypto.randomUUID()}${type.ext}`;
  await writeFile(path.join(dir, storedName), buffer);

  return {
    storedPath: path.posix.join(safeFolder, storedName),
    fileName: file.name.slice(0, 180),
    mimeType: file.type,
    size: file.size,
  };
}

function resolveSafe(storedPath: string): string {
  const resolved = path.resolve(ROOT, storedPath);
  if (!resolved.startsWith(ROOT + path.sep) && resolved !== ROOT) {
    throw new Error("Invalid file path.");
  }
  return resolved;
}

export async function readStored(storedPath: string): Promise<Buffer> {
  if (storedPath.startsWith(DB_PREFIX)) {
    const row = await prisma.storedFile.findUnique({
      where: { id: storedPath.slice(DB_PREFIX.length) },
      select: { data: true },
    });
    if (!row) throw new Error("File not found.");
    return Buffer.from(row.data);
  }
  return readFile(resolveSafe(storedPath));
}

export async function deleteStored(storedPath: string): Promise<void> {
  if (storedPath.startsWith(DB_PREFIX)) {
    await prisma.storedFile
      .delete({ where: { id: storedPath.slice(DB_PREFIX.length) } })
      .catch(() => undefined);
    return;
  }
  try {
    await unlink(resolveSafe(storedPath));
  } catch {
    // already gone — ignore
  }
}

export const UPLOAD_LIMITS = { maxSize: MAX_SIZE, types: Object.keys(ALLOWED) };
