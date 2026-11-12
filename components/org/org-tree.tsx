"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Printer,
  Search,
  Users,
  X,
} from "lucide-react";
import type { DesignationOption, OrgNode, OrgTree } from "@/lib/org-types";
import { Avatar, Badge, Button, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Props = {
  tree: OrgTree;
  designations: DesignationOption[];
};

const CARD_STYLES: Record<string, string> = {
  top: "border-amber-300 bg-gradient-to-b from-amber-50 to-white",
  admin: "border-solar-300 bg-gradient-to-b from-solar-50 to-white",
  manager: "border-sky-300 bg-gradient-to-b from-sky-50 to-white",
  leader: "border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white",
  staff: "border-slate-200 bg-white",
};

function cardStyle(node: OrgNode) {
  if (node.designationLevel >= 90) return CARD_STYLES.top;
  if (node.designationLevel >= 80) return CARD_STYLES.admin;
  if (node.designationLevel >= 65) return CARD_STYLES.manager;
  if (node.designationLevel >= 55) return CARD_STYLES.leader;
  return CARD_STYLES.staff;
}

function statusTone(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "TERMINATED") return "danger" as const;
  return "neutral" as const;
}

function matches(node: OrgNode, query: string, designation: string, status: string) {
  if (designation && node.designation !== designation) return false;
  if (status && node.status !== status) return false;
  if (!query) return true;
  const haystack = [node.fullName, node.employeeId, node.designation, node.department, node.area, node.email]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

/** Keep a node when it or any descendant matches the active filters. */
function filterTree(nodes: OrgNode[], query: string, designation: string, status: string): OrgNode[] {
  const out: OrgNode[] = [];
  for (const node of nodes) {
    const children = filterTree(node.children, query, designation, status);
    if (matches(node, query, designation, status) || children.length) {
      out.push({ ...node, children });
    }
  }
  return out;
}

function countMatches(nodes: OrgNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countMatches(n.children), 0);
}

export function OrgTreeView({ tree, designations }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(0.85);
  const [fullscreen, setFullscreen] = useState(false);
  const [query, setQuery] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<OrgNode | null>(null);
  const [transfer, setTransfer] = useState<OrgNode | null>(null);

  // On narrow screens the chart is wider than the canvas. Start from the
  // centre so the top authority is visible instead of the empty left edge.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.scrollLeft = Math.max(0, (canvas.scrollWidth - canvas.clientWidth) / 2);
  }, [tree.total, fullscreen]);

  const filtering = Boolean(query || designationFilter || statusFilter);
  const visibleRoots = useMemo(
    () => (filtering ? filterTree(tree.roots, query, designationFilter, statusFilter) : tree.roots),
    [tree.roots, filtering, query, designationFilter, statusFilter],
  );
  const matchCount = filtering ? countMatches(visibleRoots) : tree.total;

  const designationNames = useMemo(
    () => Array.from(new Set(tree.flat.map((n) => n.designation))).sort(),
    [tree.flat],
  );

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    const ids = new Set<string>();
    const walk = (nodes: OrgNode[]) => {
      for (const n of nodes) {
        if (n.children.length) ids.add(n.id);
        walk(n.children);
      }
    };
    walk(tree.roots);
    setCollapsed(ids);
  }

  function fitToScreen() {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const natural = stage.scrollWidth / zoom;
    const usable = canvas.clientWidth - 48;
    if (natural > 0) setZoom(Math.min(1.1, Math.max(0.35, usable / natural)));
  }

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex flex-col bg-slate-50" : ""}>
      {/* Toolbar */}
      <div className={`no-print mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm ${fullscreen ? "mx-3 mt-3" : ""}`}>
        <div className="relative min-w-[190px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, employee ID, designation…"
            className="input h-9 pl-9 text-xs"
          />
        </div>
        <Select value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)} className="h-9 w-auto text-xs">
          <option value="">All designations</option>
          {designationNames.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 w-auto text-xs">
          <option value="">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="TERMINATED">Terminated</option>
        </Select>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button type="button" onClick={expandAll} className="rounded px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white">Expand all</button>
          <button type="button" onClick={collapseAll} className="rounded px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white">Collapse all</button>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.35, +(z - 0.1).toFixed(2)))} className="rounded p-1 text-slate-600 hover:bg-white" aria-label="Zoom out">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center text-[11px] font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2)))} className="rounded p-1 text-slate-600 hover:bg-white" aria-label="Zoom in">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={fitToScreen} className="rounded px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white">Fit</button>
        </div>
        <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
          <Printer className="h-3.5 w-3.5" /> Print / Save PDF
        </button>
        <button type="button" onClick={() => setFullscreen((v) => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {fullscreen ? "Exit" : "Full screen"}
        </button>
      </div>

      {filtering ? (
        <p className={`no-print mb-2 text-[11px] font-medium text-slate-500 ${fullscreen ? "px-4" : ""}`}>
          {matchCount} employee{matchCount === 1 ? "" : "s"} match the current filters.
        </p>
      ) : null}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`org-print-root org-canvas relative overflow-auto rounded-xl border border-slate-200 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:18px_18px] ${fullscreen ? "mx-3 mb-3 flex-1" : "max-h-[70vh] min-h-[320px]"}`}
      >
        {visibleRoots.length ? (
          <div ref={stageRef} className="org-canvas-inner w-max min-w-full px-6 py-6" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
            <div className="flex items-start justify-center gap-10">
              {visibleRoots.map((root) => (
                <TreeNode
                  key={root.id}
                  node={root}
                  depth={0}
                  collapsed={collapsed}
                  forceOpen={filtering}
                  onToggle={toggle}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid place-items-center py-20 text-center">
            <Users className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No employees match your filters.</p>
            <button type="button" onClick={() => { setQuery(""); setDesignationFilter(""); setStatusFilter(""); }} className="mt-2 text-xs font-semibold text-solar-700 hover:underline">
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="no-print mt-2 flex flex-wrap items-center gap-3 text-[10px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-50" /> Super Admin / Admin</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-sky-300 bg-sky-50" /> Manager / Area Manager</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-indigo-200 bg-indigo-50" /> Team Leader</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-slate-200 bg-white" /> Field staff</span>
        <span className="ml-auto">Click a card to view details · {tree.total} employees visible</span>
      </div>

      {selected ? (
        <ProfilePanel
          node={selected}
          canTransfer={tree.access.canTransfer}
          isSelf={selected.id === tree.access.selfId}
          onClose={() => setSelected(null)}
          onTransfer={() => {
            setTransfer(selected);
            setSelected(null);
          }}
        />
      ) : null}

      {transfer ? (
        <TransferDialog
          node={transfer}
          nodes={tree.flat}
          designations={designations}
          onClose={() => setTransfer(null)}
          onDone={() => {
            setTransfer(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ tree */

function TreeNode({
  node,
  depth,
  collapsed,
  forceOpen,
  onToggle,
  onSelect,
}: {
  node: OrgNode;
  depth: number;
  collapsed: Set<string>;
  forceOpen: boolean;
  onToggle: (id: string) => void;
  onSelect: (node: OrgNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const open = forceOpen || !collapsed.has(node.id);

  return (
    <div className="org-node">
      <button
        type="button"
        onClick={() => onSelect(node)}
        className={`org-card group relative w-[228px] rounded-xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardStyle(node)} ${node.isSelf ? "ring-2 ring-solar-500 ring-offset-2" : ""}`}
      >
        <div className="flex items-start gap-2.5">
          <div className="relative">
            <Avatar name={node.fullName} src={node.photoUrl} size={38} />
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${node.status === "ACTIVE" ? "bg-emerald-500" : node.status === "TERMINATED" ? "bg-rose-500" : "bg-slate-400"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold leading-tight text-navy-900">{node.fullName}</p>
            <p className="mt-0.5 font-mono text-[9px] text-slate-400">{node.employeeId}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-slate-600">{node.designation}</p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Badge tone={statusTone(node.status)} className="text-[9px]">{node.status}</Badge>
          {node.isSelf ? <Badge tone="brand" className="text-[9px]">You</Badge> : null}
          {node.department ? <span className="truncate text-[9px] text-slate-400">{node.department}</span> : null}
        </div>

        <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-1.5 text-[9px] text-slate-500">
          <p className="truncate"><span className="text-slate-400">Reports to:</span> {node.managerName || "—"}</p>
          <p><span className="text-slate-400">Joined:</span> {formatDate(node.joiningDate)}</p>
        </div>

        <div className="mt-2 flex items-center justify-between text-[9px] font-semibold">
          <span className="inline-flex items-center gap-1 text-slate-500"><Users className="h-3 w-3" /> {node.directCount} direct · {node.totalCount} total</span>
          {hasChildren ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onToggle(node.id); } }}
              className="inline-flex items-center gap-0.5 rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-white"
            >
              {open ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
              {open ? "Collapse" : `Expand (${node.directCount})`}
            </span>
          ) : null}
        </div>
      </button>

      {hasChildren && open ? (
        <>
          <div className="org-downline" />
          <div className="org-children">
            {node.children.map((child) => (
              <div className="org-child" key={child.id}>
                <TreeNode
                  node={child}
                  depth={depth + 1}
                  collapsed={collapsed}
                  forceOpen={forceOpen}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- panels */

function ProfilePanel({
  node,
  canTransfer,
  isSelf,
  onClose,
  onTransfer,
}: {
  node: OrgNode;
  canTransfer: boolean;
  isSelf: boolean;
  onClose: () => void;
  onTransfer: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-navy-950/40 backdrop-blur-[1px]" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-bold text-navy-900">Employee profile</p>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <Avatar name={node.fullName} src={node.photoUrl} size={56} />
            <div className="min-w-0">
              <p className="text-base font-bold text-navy-900">{node.fullName}</p>
              <p className="font-mono text-[10px] text-slate-400">{node.employeeId}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge tone="brand">{node.designation}</Badge>
                <Badge tone={statusTone(node.status)}>{node.status}</Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniStat label="Direct team" value={node.directCount} />
            <MiniStat label="Total team" value={node.totalCount} />
            <MiniStat label="Customers" value={node.customers} />
            <MiniStat label="Role" value={node.roleName || "—"} />
          </div>

          <dl className="mt-4 divide-y divide-slate-100 text-xs">
            <Row label="Reporting manager" value={node.managerName || "—"} />
            <Row label="Department" value={node.department || "—"} />
            <Row label="Work area" value={node.area || "—"} />
            <Row label="Joining date" value={formatDate(node.joiningDate)} />
            <Row label="Mobile" value={node.mobile || "Hidden"} />
            <Row label="Email" value={node.email || "—"} />
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/app/staff/${node.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-800">
              <ExternalLink className="h-3.5 w-3.5" /> Full profile
            </Link>
            {canTransfer && !isSelf ? (
              <Button variant="outline" size="sm" onClick={onTransfer}>
                <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer / change manager
              </Button>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-navy-900">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[60%] break-words text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function TransferDialog({
  node,
  nodes,
  designations,
  onClose,
  onDone,
}: {
  node: OrgNode;
  nodes: OrgNode[];
  designations: DesignationOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [managerId, setManagerId] = useState(node.managerId || "");
  const [designation, setDesignation] = useState(node.designation);
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = useMemo(() => {
    const ids = new Set<string>();
    const walk = (n: OrgNode) => {
      ids.add(n.id);
      n.children.forEach(walk);
    };
    walk(node);
    return ids;
  }, [node]);

  const managerOptions = nodes
    .filter((n) => !blocked.has(n.id) && n.status === "ACTIVE")
    .sort((a, b) => b.designationLevel - a.designationLevel || a.fullName.localeCompare(b.fullName));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${node.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toManagerId: managerId || null,
          designation: designation || undefined,
          reason: reason || undefined,
          effectiveDate: effectiveDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed.");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-navy-950/50 p-4" onClick={onClose}>
      <form onSubmit={submit} className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-navy-900">Transfer employee</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{node.fullName} · {node.employeeId} · currently under {node.managerName || "no manager"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="label">New reporting manager</span>
            <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">No manager (top level)</option>
              {managerOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.fullName} — {m.designation} ({m.employeeId})</option>
              ))}
            </Select>
            <span className="mt-1 block text-[10px] text-slate-400">Employee ka poora team automatically is manager ke neeche move ho jayega.</span>
          </label>

          <label className="block">
            <span className="label">Designation</span>
            <Select value={designation} onChange={(e) => setDesignation(e.target.value)}>
              {designations.map((d) => <option key={d.id} value={d.name}>{d.name} (level {d.level})</option>)}
            </Select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Effective date</span>
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="label">Reason</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="input" placeholder="Transfer reason" />
            </label>
          </div>
        </div>

        {error ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</div> : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Confirm transfer"}</Button>
        </div>
      </form>
    </div>
  );
}
