import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { transactionSchema } from "@/lib/validation";
import { can } from "@/lib/auth";
import { customerScope } from "@/lib/access";

export const POST = withApi(async (request) => {
  const user = await requireApi("finance.manage");
  const input = await parseBody(request, transactionSchema);

  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) throw new HttpError(422, "Valid transaction date required.");

  if (input.customerId) {
    const scope = await customerScope(user);
    const customer = await prisma.customer.findFirst({
      where: { AND: [{ id: input.customerId }, scope] },
      select: { id: true, fullName: true, customerCode: true },
    });
    if (!customer) throw new HttpError(404, "Customer not found or not accessible.");
  }
  if (input.staffId) {
    const staff = await prisma.staff.findUnique({ where: { id: input.staffId }, select: { id: true } });
    if (!staff) throw new HttpError(404, "Staff member not found.");
  }

  const transaction = await prisma.transaction.create({
    data: {
      type: input.type,
      category: input.category,
      amount: input.amount,
      date,
      description: input.description || null,
      reference: input.reference || null,
      paymentMode: input.paymentMode,
      customerId: input.customerId,
      staffId: input.staffId,
      createdById: user.id,
    },
  });

  await auditRequest(user, request, "CREATE", "Transaction", transaction.id, {
    type: transaction.type,
    category: transaction.category,
    amount: transaction.amount,
    date: transaction.date,
  });

  return json({ ok: true, id: transaction.id }, 201);
});

export const GET = withApi(async (request) => {
  const user = await requireApi("finance.view");
  if (!can(user, "finance.view")) throw new HttpError(403, "Finance access required.");

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take")) || 25));

  const where = {
    ...(type ? { type } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {}),
  };

  const rows = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take,
    include: { customer: { select: { fullName: true, customerCode: true } }, staff: { select: { fullName: true } } },
  });
  return json({ rows });
});
