import { requirePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { CustomerForm } from "@/components/customers/customer-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Customer" };

export default async function NewCustomerPage() {
  const user = await requirePermission("customer.create");

  const [staff, setting] = await Promise.all([
    can(user, "staff.view")
      ? prisma.staff.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, fullName: true, designation: true },
          orderBy: { fullName: "asc" },
        })
      : Promise.resolve([]),
    prisma.setting.findUnique({ where: { key: "default_system_cost_per_kw" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="New customer"
        subtitle="Field visit ke baad customer ki details bharein. Customer ID automatically generate hogi."
        eyebrow="CRM"
      />
      <CustomerForm
        staffOptions={staff}
        defaultCostPerKw={Number(setting?.value || 70000)}
      />
    </div>
  );
}
