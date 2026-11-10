import "server-only";
import { prisma } from "./db";

/**
 * Atomic, human-readable document numbers.
 * Example: nextSequence("customer-2026", 4, "UE-C-2026") -> "UE-C-2026-0001"
 */
export async function nextSequence(
  key: string,
  pad: number,
  prefix: string,
): Promise<string> {
  const counter = await prisma.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${prefix}-${String(counter.value).padStart(pad, "0")}`;
}

export async function nextCustomerCode(): Promise<string> {
  const year = new Date().getFullYear();
  return nextSequence(`customer-${year}`, 4, `UE-C-${year}`);
}

export async function nextEmployeeId(): Promise<string> {
  return nextSequence("employee", 3, "UE-EMP");
}

export async function nextSlipNo(month: string): Promise<string> {
  const compact = month.replace("-", "");
  return nextSequence(`salary-${month}`, 4, `UE-SL-${compact}`);
}
