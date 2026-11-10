"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/toast";
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_MODES,
} from "@/lib/constants";
import { toInputDate } from "@/lib/utils";

export function TransactionForm({
  customers,
  staff,
  defaultCustomerId,
}: {
  customers: { id: string; fullName: string; customerCode: string }[];
  staff: { id: string; fullName: string }[];
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(Boolean(defaultCustomerId));
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [category, setCategory] = useState("CUSTOMER_PAYMENT");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toInputDate(new Date()));
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [mode, setMode] = useState("CASH");
  const [customerId, setCustomerId] = useState(defaultCustomerId || "");
  const [staffId, setStaffId] = useState("");
  const [saving, setSaving] = useState(false);

  const categories = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function changeType(next: "INCOME" | "EXPENSE") {
    setType(next);
    setCategory(next === "INCOME" ? "CUSTOMER_PAYMENT" : "OFFICE");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          amount: Number(amount),
          date,
          description: description || undefined,
          reference: reference || undefined,
          paymentMode: mode,
          customerId: customerId || null,
          staffId: staffId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transaction save nahi hui.");
      toast.push("success", "Transaction recorded", `${type === "INCOME" ? "Income" : "Expense"} ₹${Number(amount).toLocaleString("en-IN")} saved.`);
      setAmount("");
      setDescription("");
      setReference("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.push("error", "Could not save", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Record transaction
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form onSubmit={submit} className="relative my-6 w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-pop">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Record income / expense</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">Every entry is audited with your user, time and amount.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <Field label="Type" required>
                <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => changeType("INCOME")}
                    className={`rounded-md px-2 py-1.5 text-xs font-bold transition ${type === "INCOME" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => changeType("EXPENSE")}
                    className={`rounded-md px-2 py-1.5 text-xs font-bold transition ${type === "EXPENSE" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500"}`}
                  >
                    Expense
                  </button>
                </div>
              </Field>
              <Field label="Category" required>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
                </Select>
              </Field>
              <Field label="Amount (₹)" required>
                <Input type="number" min={1} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </Field>
              <Field label="Date" required>
                <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Payment mode" required>
                <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                  {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Reference" hint="Receipt / UTR / cheque number">
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Customer" hint="Link payment to a customer">
                <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">No customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.fullName} · {c.customerCode}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Staff" hint="For commission / travel payouts">
                <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                  <option value="">No staff</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </Select>
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this entry for?" />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Save transaction
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
