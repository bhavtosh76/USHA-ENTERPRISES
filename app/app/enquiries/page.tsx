import type { Prisma } from "@prisma/client";
import { Inbox, Phone, Search, Filter } from "lucide-react";
import { can, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Select, StatCard } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { EnquiryStatus } from "@/components/enquiries/enquiry-status";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

const TONES: Record<string, "info" | "warning" | "success" | "neutral"> = {
  NEW: "warning",
  CONTACTED: "info",
  CONVERTED: "success",
  CLOSED: "neutral",
};

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("customer.view");
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const status = one(sp.status);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const pageSize = 25;

  const filters: Prisma.EnquiryWhereInput[] = [];
  if (q) {
    filters.push({
      OR: [
        { name: { contains: q } },
        { mobile: { contains: q } },
        { village: { contains: q } },
        { message: { contains: q } },
      ],
    });
  }
  if (status) filters.push({ status });
  const where: Prisma.EnquiryWhereInput = filters.length ? { AND: filters } : {};

  const [total, rows, counts] = await Promise.all([
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.enquiry.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const canUpdate = can(user, "customer.edit");

  const makeHref = (p: number) => {
    const params = new URLSearchParams({ page: String(p) });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    return `/app/enquiries?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Website enquiries"
        subtitle="Public website se aayi consultation requests — contact karein aur convert karein."
        eyebrow="Operations"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total enquiries" value={total} icon={<Inbox className="h-5 w-5" />} tone="brand" />
        <StatCard label="New" value={count("NEW")} tone="warning" />
        <StatCard label="Contacted" value={count("CONTACTED")} tone="info" />
        <StatCard label="Converted" value={count("CONVERTED")} tone="success" />
      </div>

      <Card className="mb-4">
        <form action="/app/enquiries" className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Name, mobile, village, message…" className="input pl-9" />
          </div>
          <Select name="status" defaultValue={status} aria-label="Status">
            <option value="">All status</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="CONVERTED">Converted</option>
            <option value="CLOSED">Closed</option>
          </Select>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-navy-900 px-4 text-xs font-semibold text-white hover:bg-navy-800">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            <Link href="/app/enquiries" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</Link>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Enquiry inbox" subtitle={`${total} request${total === 1 ? "" : "s"} · website form + public calculator leads`} />
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Received</th>
                <th>Person</th>
                <th>Village / District</th>
                <th>Capacity</th>
                <th>Message</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-[11px] text-slate-500">{formatDateTime(r.createdAt)}</td>
                  <td>
                    <p className="text-xs font-semibold text-navy-900">{r.name}</p>
                    <a href={`tel:${r.mobile}`} className="inline-flex items-center gap-1 text-[10px] text-solar-700 hover:underline">
                      <Phone className="h-3 w-3" /> {r.mobile}
                    </a>
                  </td>
                  <td className="text-xs">{r.village || "—"}<p className="text-[10px] text-slate-400">{r.district || "—"}</p></td>
                  <td className="text-xs">{r.capacityKw ? `${r.capacityKw} kW` : "—"}</td>
                  <td className="max-w-[280px] text-xs text-slate-600"><p className="line-clamp-2">{r.message || "—"}</p></td>
                  <td><Badge tone={TONES[r.status] || "neutral"}>{r.status}</Badge></td>
                  <td>{canUpdate ? <EnquiryStatus id={r.id} current={r.status} /> : <span className="text-[10px] text-slate-400">View only</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <EmptyState icon={<Inbox className="h-5 w-5" />} title="No enquiries found" description="Website enquiries yahan automatically aa jayengi." />
        ) : (
          <Pagination page={page} pageCount={Math.ceil(total / pageSize)} total={total} makeHref={makeHref} />
        )}
      </Card>
    </div>
  );
}
