import { prisma } from "@/lib/db";
import { requireApi, parseBody, withApi, json, auditRequest, HttpError } from "@/lib/api";
import { designationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireApi("staff.view");
  const [designations, departments] = await Promise.all([
    prisma.designation.findMany({
      where: { isActive: true },
      orderBy: [{ level: "desc" }, { name: "asc" }],
      select: { id: true, name: true, level: true, description: true, isSystem: true, department: { select: { name: true } } },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return json({ designations, departments });
});

export const POST = withApi(async (request) => {
  const user = await requireApi("settings.manage");
  const input = await parseBody(request, designationSchema);

  const existing = await prisma.designation.findUnique({ where: { name: input.name } });
  if (existing) throw new HttpError(409, "This designation already exists.");

  let departmentId: string | null = null;
  if (input.department) {
    const department = await prisma.department.upsert({
      where: { name: input.department },
      create: { name: input.department },
      update: {},
    });
    departmentId = department.id;
  }

  const designation = await prisma.designation.create({
    data: {
      name: input.name,
      level: input.level,
      description: input.description || null,
      departmentId,
      isSystem: false,
    },
  });

  await auditRequest(user, request, "CREATE", "Designation", designation.id, {
    name: designation.name,
    level: designation.level,
  });

  return json({ ok: true, designation }, 201);
});
