"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCog, Loader2, X } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import { monthOptions } from "@/lib/utils";

export function GeneratePayrollDialog({
  defaultMonth,
  defaultWorkingDays,
  defaultOvertimeRate,
  staff,
}: {
  defaultMonth: string;
  defaultWorkingDays: number;
  defaultOvertimeRate: number;
  staff: { id: string; fullName: string; employeeId: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(defaultMonth);
  const [staffId, setStaffId] = useState("");
  const [workingDays, setWorkingDays] = useState(String(defaultWorkingDays));
  const [overtimeRate, setOvertimeRate] = useState(String(defaultOvertimeRate));
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          staffId: staffId || null,
          workingDays: Number(workingDays) || 26,
          overtimeRatePerHour: Number(overtimeRate) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payroll generate nahi ho paya.");
      toast.push(
        "success",
        "Payroll generated",
        `${data.created} slips created${data.skipped ? `, ${data.skipped} skipped` : ""}. Total net ₹${Number(data.totalNet || 0).toLocaleString("en-IN")}.`,
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.push("error", "Generation failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <CalendarCog className="h-3.5 w-3.5" /> Generate payroll
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-pop">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Generate salary slips</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Attendance se payable days calculate honge. Existing approved / paid slips skip hongi.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <Field label="Month" required>
                <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                  {monthOptions(18).map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Staff" hint="Blank = all eligible staff">
                <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                  <option value="">All staff</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.employeeId})</option>
                  ))}
                </Select>
              </Field>
              <Field label="Working days" required hint="Per-day rate = fixed salary ÷ working days">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                />
              </Field>
              <Field label="Overtime rate (₹ / hour)" hint="Blank uses company setting">
                <Input
                  type="number"
                  min={0}
                  value={overtimeRate}
                  onChange={(e) => setOvertimeRate(e.target.value)}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={submit} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCog className="h-3.5 w-3.5" />}
                Generate
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
