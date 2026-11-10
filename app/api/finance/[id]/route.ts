import { prisma } from "@/lib/db";
import { requireApi, withApi, json, auditRequest, HttpError } from "@/lib/api";

export const DELETE = withApi(async (request, context: { params: Promise<Record<string, string>> }) => {
  const user = await requireApi("finance.manage");
  const { id } = await context.params;
  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) throw new HttpError(404, "Transaction not found.");
  if (transaction.category === "SALARY") {
    throw new HttpError(422, "Salary transactions payroll se manage hoti hain. Direct delete allowed nahi hai.");
  }
  await prisma.transaction.delete({ where: { id } });
  await auditRequest(user, request, "DELETE", "Transaction", id, {
    type: transaction.type,
    category: transaction.category,
    amount: transaction.amount,
    date: transaction.date,
  });
  return json({ ok: true });
});
