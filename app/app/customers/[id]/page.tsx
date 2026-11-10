import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CircleDollarSign,
  Clock,
  Edit3,
  Landmark,
  MapPin,
  Phone,
  Sun,
  Wrench,
} from "lucide-react";
import { requirePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessCustomer } from "@/lib/access";
import { Badge, Card, CardHeader, InfoRow, LinkButton } from "@/components/ui";
import { StatusUpdater } from "@/components/customers/status-updater";
import { DocumentManager } from "@/components/customers/document-manager";
import { ArchiveCustomerButton } from "@/components/customers/archive-button";
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_TONES } from "@/lib/constants";
import { formatDate, formatDateTime, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("customer.view");
  const { id } = await params;
  if (!(await canAccessCustomer(user, id))) notFound();

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      assignedStaff: { select: { id: true, fullName: true, designation: true, mobile: true } },
      createdBy: { select: { name: true } },
      documents: {
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: { select: { name: true } },
          verifiedBy: { select: { name: true } },
        },
      },
      history: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { name: true } } },
      },
      installation: { include: { teamLead: { select: { fullName: true } } } },
      transactions: { orderBy: { date: "desc" }, take: 20 },
      subsidyCalcs: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  if (!customer) notFound();

  const received = customer.transactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const pending = Math.max(0, customer.systemCost - received);

  return (
    <div>
      <Link href="/app/customers" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-3.5 w-3.5" /> All customers
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-100 text-lg font-bold text-navy-700">
            {customer.fullName.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-navy-900">{customer.fullName}</h1>
              <Badge tone={STATUS_TONES[customer.status] || "neutral"}>{STATUS_LABELS[customer.status] || customer.status}</Badge>
              {customer.isArchived ? <Badge tone="danger">Archived</Badge> : null}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {customer.customerCode} · Applied {formatDate(customer.applicationDate)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <a href={`tel:${customer.mobile}`} className="inline-flex items-center gap-1 hover:text-solar-700"><Phone className="h-3 w-3" /> {customer.mobile}</a>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {customer.village || "—"}, {customer.tehsil || customer.district}</span>
              <span className="inline-flex items-center gap-1"><Sun className="h-3 w-3" /> {customer.capacityKw} kW</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {can(user, "customer.edit") ? (
            <LinkButton href={`/app/customers/${customer.id}/edit`} variant="outline" size="sm">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </LinkButton>
          ) : null}
          {can(user, "finance.manage") ? (
            <LinkButton href={`/app/finance?customer=${customer.id}`} size="sm" variant="secondary">
              <Banknote className="h-3.5 w-3.5" /> Record payment
            </LinkButton>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: "Capacity", value: `${customer.capacityKw} kW`, icon: Sun },
              { label: "System cost", value: formatINR(customer.systemCost), icon: CircleDollarSign },
              { label: "Received", value: formatINR(received), icon: Landmark },
              { label: "Pending", value: formatINR(pending), icon: Clock },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <s.icon className="h-3 w-3" /> {s.label}
                </div>
                <p className="mt-1 text-base font-bold text-navy-900">{s.value}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader title="Customer details" subtitle="Personal, address and electricity information" />
            <div className="grid gap-x-8 gap-y-0 p-5 sm:grid-cols-2">
              <div className="divide-y divide-slate-50">
                <InfoRow label="Full name" value={customer.fullName} />
                <InfoRow label="Father's name" value={customer.fatherName || "—"} />
                <InfoRow label="Date of birth" value={customer.dob ? formatDate(customer.dob) : "—"} />
                <InfoRow label="Mobile" value={customer.mobile} />
                <InfoRow label="Alternate mobile" value={customer.altMobile || "—"} />
              </div>
              <div className="divide-y divide-slate-50">
                <InfoRow label="State / District" value={`${customer.state} / ${customer.district}`} />
                <InfoRow label="Tehsil / Village" value={`${customer.tehsil || "—"} / ${customer.village || "—"}`} />
                <InfoRow label="PIN code" value={customer.pinCode || "—"} />
                <InfoRow label="Full address" value={customer.address || "—"} />
              </div>
            </div>
            <div className="grid gap-x-8 gap-y-0 border-t border-slate-100 p-5 sm:grid-cols-2">
              <div className="divide-y divide-slate-50">
                <InfoRow label="Consumer number" value={customer.consumerNumber || "—"} />
                <InfoRow label="DISCOM" value={customer.discom || "—"} />
              </div>
              <div className="divide-y divide-slate-50">
                <InfoRow label="Connection type" value={customer.connectionType || "—"} />
                <InfoRow label="Sanctioned load" value={customer.sanctionedLoad || "—"} />
              </div>
            </div>
            {customer.remarks ? (
              <div className="border-t border-slate-100 px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remarks</p>
                <p className="mt-1 text-xs text-slate-600">{customer.remarks}</p>
              </div>
            ) : null}
          </Card>

          <DocumentManager
            customerId={customer.id}
            customerName={customer.fullName}
            canVerify={can(user, "customer.verify_docs")}
            canDelete={can(user, "customer.delete") || can(user, "customer.verify_docs")}
            canUpload={can(user, "customer.edit")}
            documents={customer.documents.map((d) => ({
              id: d.id,
              type: d.type,
              fileName: d.fileName,
              mimeType: d.mimeType,
              size: d.size,
              status: d.status,
              notes: d.notes,
              createdAt: d.createdAt.toISOString(),
              uploaderName: d.uploadedBy?.name ?? null,
              verifierName: d.verifiedBy?.name ?? null,
              extractedName: d.extractedName,
              extractedDob: d.extractedDob,
              extractedAddress: d.extractedAddress,
            }))}
          />

          <Card>
            <CardHeader
              title="Installation"
              subtitle={customer.installation ? "Panel, inverter and net metering record" : "No installation record yet"}
              action={
                can(user, "installation.manage") ? (
                  <LinkButton href={`/app/installations?customer=${customer.id}`} size="sm" variant="outline">
                    <Wrench className="h-3.5 w-3.5" /> {customer.installation ? "Manage" : "Create"}
                  </LinkButton>
                ) : null
              }
            />
            {customer.installation ? (
              <div className="grid gap-x-8 gap-y-0 p-5 sm:grid-cols-2">
                <div className="divide-y divide-slate-50">
                  <InfoRow label="Installation date" value={formatDate(customer.installation.installationDate)} />
                  <InfoRow label="Capacity" value={`${customer.installation.capacityKw} kW`} />
                  <InfoRow label="Team lead" value={customer.installation.teamLead?.fullName || "—"} />
                  <InfoRow label="Completion" value={<Badge tone={customer.installation.completionStatus === "COMPLETED" ? "success" : "warning"}>{customer.installation.completionStatus}</Badge>} />
                </div>
                <div className="divide-y divide-slate-50">
                  <InfoRow label="Inverter" value={`${customer.installation.inverterBrand || "—"} ${customer.installation.inverterModel || ""}`} />
                  <InfoRow label="Inverter serial" value={customer.installation.inverterSerial || "—"} />
                  <InfoRow label="Panel" value={`${customer.installation.panelBrand || "—"} ${customer.installation.panelModel || ""} (${customer.installation.panelCount || 0})`} />
                  <InfoRow label="Net meter" value={<Badge tone={customer.installation.netMeterStatus === "APPROVED" ? "success" : "info"}>{customer.installation.netMeterStatus}</Badge>} />
                </div>
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-xs text-slate-500">
                Installation details add karein — panel/inverter serial numbers, photos aur inspection status.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Payments & transactions"
              subtitle={`${formatINR(received)} received · ${formatINR(pending)} pending`}
              action={can(user, "finance.view") ? <Link href={`/app/finance?q=${encodeURIComponent(customer.customerCode)}`} className="text-[11px] font-semibold text-solar-700 hover:underline">Open finance</Link> : null}
            />
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr><th>Date</th><th>Type</th><th>Category</th><th className="text-right">Amount</th><th>Mode</th></tr>
                </thead>
                <tbody>
                  {customer.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap text-[11px]">{formatDate(t.date)}</td>
                      <td><Badge tone={t.type === "INCOME" ? "success" : "danger"}>{t.type}</Badge></td>
                      <td className="text-xs">{CATEGORY_LABELS[t.category] || t.category}</td>
                      <td className="text-right text-xs font-semibold">{formatINR(t.amount)}</td>
                      <td className="text-[11px] text-slate-500">{t.paymentMode}</td>
                    </tr>
                  ))}
                  {!customer.transactions.length ? (
                    <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-500">No transactions recorded for this customer.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          {customer.subsidyCalcs.length ? (
            <Card>
              <CardHeader title="Subsidy calculations" subtitle="Saved estimates for this customer" />
              <div className="divide-y divide-slate-100">
                {customer.subsidyCalcs.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{s.capacityKw} kW · {s.state}</p>
                      <p className="text-[10px] text-slate-400">{formatDateTime(s.createdAt)}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold text-emerald-700">{formatINR(s.totalSubsidy)} subsidy</p>
                      <p className="text-[10px] text-slate-400">Contribution {formatINR(s.customerContribution)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          {can(user, "customer.edit") ? <StatusUpdater customerId={customer.id} current={customer.status} /> : null}

          <Card>
            <CardHeader title="Application timeline" subtitle="Every status change is recorded" />
            <div className="p-5">
              <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                {customer.history.map((h, i) => (
                  <li key={h.id} className="relative">
                    <span className={`absolute -left-[26px] top-0.5 grid h-3 w-3 place-items-center rounded-full ring-4 ring-white ${i === 0 ? "bg-solar-500" : "bg-slate-300"}`} />
                    <p className="text-xs font-semibold text-slate-800">{STATUS_LABELS[h.status] || h.status}</p>
                    {h.note ? <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{h.note}</p> : null}
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {formatDateTime(h.createdAt)}{h.changedBy ? ` · ${h.changedBy.name}` : ""}
                    </p>
                  </li>
                ))}
                {!customer.history.length ? <p className="text-xs text-slate-400">No history yet.</p> : null}
              </ol>
            </div>
          </Card>

          <Card>
            <CardHeader title="Record information" />
            <div className="divide-y divide-slate-50 px-5 py-2">
              <InfoRow label="Customer ID" value={<span className="font-mono text-[11px]">{customer.customerCode}</span>} />
              <InfoRow label="Assigned staff" value={customer.assignedStaff?.fullName || "Unassigned"} />
              <InfoRow label="Designation" value={customer.assignedStaff?.designation || "—"} />
              <InfoRow label="Created by" value={customer.createdBy?.name || "—"} />
              <InfoRow label="Created at" value={formatDateTime(customer.createdAt)} />
              <InfoRow label="Documents" value={`${customer.documents.length} uploaded`} />
              <InfoRow label="Last updated" value={formatDateTime(customer.updatedAt)} />
            </div>
          </Card>

          {can(user, "subsidy.view") ? (
            <div className="rounded-xl border border-solar-200 bg-solar-50/60 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-solar-900"><Sun className="h-4 w-4" /> Subsidy estimate</p>
              <p className="mt-1 text-[11px] leading-relaxed text-solar-800">
                Is customer ki capacity ke hisaab se eligible subsidy calculate karein. Rates admin-managed hain.
              </p>
              <LinkButton href={`/app/subsidy-schemes?capacity=${customer.capacityKw}&customer=${customer.id}`} size="sm" className="mt-3 w-full">
                Calculate subsidy
              </LinkButton>
            </div>
          ) : null}

          {can(user, "customer.delete") && !customer.isArchived ? (
            <ArchiveCustomerButton customerId={customer.id} name={customer.fullName} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
