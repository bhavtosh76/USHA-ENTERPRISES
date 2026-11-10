"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Download,
  Loader2,
  Pencil,
  RotateCcw,
  Wallet,
  X,
} from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import { PAYMENT_MODES } from "@/lib/constants";

type Salary = {
  id: string;
  status: string;
  incentive: number;
  commission: number;
  advance: number;
  otherDeduction: number;
  remarks: string | null;
};

async function call(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/payroll/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Action failed.");
  return data;
}

export function SalaryActions({
  salary,
  canApprove,
  canManage,
}: {
  salary: Salary;
  canApprove: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mode, setMode] = useState("BANK");
  const [reference, setReference] = useState("");
  const [incentive, setIncentive] = useState(String(salary.incentive));
  const [commission, setCommission] = useState(String(salary.commission));
  const [advance, setAdvance] = useState(String(salary.advance));
  const [other, setOther] = useState(String(salary.otherDeduction));
  const [remarks, setRemarks] = useState(salary.remarks || "");

  async function run(action: string, body: Record<string, unknown> = {}, label = "Updated") {
    setBusy(action);
    try {
      await call(salary.id, { action, ...body });
      toast.push("success", label, "Salary record update ho gaya.");
      setPayOpen(false);
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      toast.push("error", "Action failed", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy("");
    }
  }

  const paid = salary.status === "PAID";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {canManage && !paid ? (
        <button
          onClick={() => setEditOpen(true)}
          className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-navy-900"
          title="Adjust salary"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {canApprove && salary.status === "PENDING" ? (
        <button
          onClick={() => run("APPROVE", {}, "Salary approved")}
          disabled={Boolean(busy)}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          title="Approve salary"
        >
          {busy === "APPROVE" ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeCheck className="h-3 w-3" />}
          Approve
        </button>
      ) : null}

      {canApprove && !paid ? (
        <button
          onClick={() => setPayOpen(true)}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-navy-200 bg-navy-50 px-2 text-[10px] font-bold text-navy-700 hover:bg-navy-100"
          title="Mark paid"
        >
          <Wallet className="h-3 w-3" /> Pay
        </button>
      ) : null}

      {canManage && (salary.status === "APPROVED" || salary.status === "PENDING") ? (
        <button
          onClick={() => run("REOPEN", {}, "Salary reopened")}
          disabled={Boolean(busy)}
          className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
          title="Reopen salary"
        >
          {busy === "REOPEN" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        </button>
      ) : null}

      <Link
        href={`/api/payroll/${salary.id}/slip`}
        className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-navy-900"
        title="Download salary slip PDF"
      >
        <Download className="h-3.5 w-3.5" />
      </Link>

      {payOpen ? (
        <Modal title="Mark salary paid" onClose={() => setPayOpen(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Payment mode" required>
              <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Reference" hint="UTR / cheque no. / cash voucher">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Payment mark karte hi company finance me salary expense entry automatically banegi.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPayOpen(false)} disabled={Boolean(busy)}>Cancel</Button>
            <Button size="sm" onClick={() => run("PAY", { paymentMode: mode, reference: reference || undefined }, "Salary paid")} disabled={Boolean(busy)}>
              {busy === "PAY" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
              Confirm payment
            </Button>
          </div>
        </Modal>
      ) : null}

      {editOpen ? (
        <Modal title="Adjust salary" onClose={() => setEditOpen(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Incentive (₹)">
              <Input type="number" min={0} value={incentive} onChange={(e) => setIncentive(e.target.value)} />
            </Field>
            <Field label="Commission (₹)">
              <Input type="number" min={0} value={commission} onChange={(e) => setCommission(e.target.value)} />
            </Field>
            <Field label="Advance deduction (₹)">
              <Input type="number" min={0} value={advance} onChange={(e) => setAdvance(e.target.value)} />
            </Field>
            <Field label="Other deduction (₹)">
              <Input type="number" min={0} value={other} onChange={(e) => setOther(e.target.value)} />
            </Field>
            <Field label="Remarks" className="sm:col-span-2">
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional note" />
            </Field>
          </div>
          <p className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-[11px] text-sky-800">
            Edit karne par slip dobara PENDING ho jayegi aur approval phir se lena hoga.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} disabled={Boolean(busy)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() =>
                run("EDIT", {
                  incentive: Number(incentive) || 0,
                  commission: Number(commission) || 0,
                  advance: Number(advance) || 0,
                  otherDeduction: Number(other) || 0,
                  remarks: remarks || undefined,
                }, "Salary adjusted")
              }
              disabled={Boolean(busy)}
            >
              {busy === "EDIT" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
              Save changes
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-pop">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-sm font-bold text-navy-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
