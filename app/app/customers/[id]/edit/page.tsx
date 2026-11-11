import { notFound } from "next/navigation";
import { requirePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessCustomer } from "@/lib/access";
import { PageHeader } from "@/components/ui";
import { CustomerForm } from "@/components/customers/customer-form";
import { toInputDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Customer" };

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("customer.edit");
  const { id } = await params;
  if (!(await canAccessCustomer(user, id))) notFound();

  const [customer, staff, setting] = await Promise.all([
    prisma.customer.findUnique({ where: { id } }),
    can(user, "staff.view")
      ? prisma.staff.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, fullName: true, designation: true },
          orderBy: { fullName: "asc" },
        })
      : Promise.resolve([]),
    prisma.setting.findUnique({ where: { key: "default_system_cost_per_kw" } }),
  ]);

  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Edit — ${customer.fullName}`}
        subtitle={`${customer.customerCode} · Status change karne par timeline mein record hoga.`}
        eyebrow="CRM"
      />
      <CustomerForm
        mode="edit"
        customerId={customer.id}
        staffOptions={staff}
        defaultCostPerKw={Number(setting?.value || 70000)}
        initial={{
          fullName: customer.fullName,
          fatherName: customer.fatherName || "",
          dob: toInputDate(customer.dob),
          mobile: customer.mobile,
          altMobile: customer.altMobile || "",
          state: customer.state,
          district: customer.district,
          tehsil: customer.tehsil || "",
          village: customer.village || "",
          address: customer.address || "",
          pinCode: customer.pinCode || "",
          consumerNumber: customer.consumerNumber || "",
          discom: customer.discom || "MVVNL",
          connectionType: customer.connectionType || "DOMESTIC",
          sanctionedLoad: customer.sanctionedLoad || "",
          capacityKw: String(customer.capacityKw),
          systemCost: String(customer.systemCost || ""),
          applicationDate: toInputDate(customer.applicationDate),
          assignedStaffId: customer.assignedStaffId || "",
          status: customer.status,
          remarks: customer.remarks || "",
        }}
      />
    </div>
  );
}
