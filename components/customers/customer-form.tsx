"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, UserPlus } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/toast";
import { CUSTOMER_STATUSES, CONNECTION_TYPES, DISCOMS, STATUS_LABELS } from "@/lib/constants";

export type CustomerFormValues = {
  fullName: string;
  fatherName: string;
  dob: string;
  mobile: string;
  altMobile: string;
  state: string;
  district: string;
  tehsil: string;
  village: string;
  address: string;
  pinCode: string;
  consumerNumber: string;
  discom: string;
  connectionType: string;
  sanctionedLoad: string;
  capacityKw: string;
  systemCost: string;
  applicationDate: string;
  assignedStaffId: string;
  status: string;
  remarks: string;
};

const empty: CustomerFormValues = {
  fullName: "",
  fatherName: "",
  dob: "",
  mobile: "",
  altMobile: "",
  state: "Uttar Pradesh",
  district: "Pilibhit",
  tehsil: "",
  village: "",
  address: "",
  pinCode: "",
  consumerNumber: "",
  discom: "MVVNL",
  connectionType: "DOMESTIC",
  sanctionedLoad: "",
  capacityKw: "3",
  systemCost: "",
  applicationDate: new Date().toISOString().slice(0, 10),
  assignedStaffId: "",
  status: "NEW",
  remarks: "",
};

export function CustomerForm({
  staffOptions,
  defaultCostPerKw,
  mode = "create",
  customerId,
  initial,
}: {
  staffOptions: { id: string; fullName: string; designation: string }[];
  defaultCostPerKw: number;
  mode?: "create" | "edit";
  customerId?: string;
  initial?: Partial<CustomerFormValues>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<CustomerFormValues>({ ...empty, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costTouched, setCostTouched] = useState(Boolean(initial?.systemCost));

  function set<K extends keyof CustomerFormValues>(key: K, value: string) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "capacityKw" && !costTouched) {
        const kw = Number(value) || 0;
        next.systemCost = String(Math.round(kw * defaultCostPerKw));
      }
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.fullName.trim() || values.fullName.trim().length < 3) {
      setError("Customer ka poora naam likhein.");
      return;
    }
    if (!/^[0-9+\-\s]{10,15}$/.test(values.mobile.trim())) {
      setError("Valid 10 digit mobile number daalein.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...values,
        capacityKw: Number(values.capacityKw) || 0,
        systemCost: Number(values.systemCost) || 0,
        assignedStaffId: values.assignedStaffId || null,
        status: values.status,
        applicationDate: values.applicationDate || undefined,
      };
      const res = await fetch(
        mode === "create" ? "/api/customers" : `/api/customers/${customerId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        const detail = data.details?.fieldErrors
          ? Object.values(data.details.fieldErrors).flat().join(" ")
          : "";
        throw new Error(detail || data.error || "Could not save customer.");
      }
      toast.push("success", mode === "create" ? "Customer created" : "Customer updated", "Record saved successfully.");
      router.push(`/app/customers/${data.customer?.id || customerId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save customer.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-navy-900">Personal details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer full name" required>
            <Input value={values.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Poora naam" />
          </Field>
          <Field label="Father's name">
            <Input value={values.fatherName} onChange={(e) => set("fatherName", e.target.value)} placeholder="Pita ka naam" />
          </Field>
          <Field label="Date of birth" hint="Aadhaar verification ke liye">
            <Input type="date" value={values.dob} onChange={(e) => set("dob", e.target.value)} />
          </Field>
          <Field label="Mobile number" required>
            <Input value={values.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="10 digit mobile" inputMode="numeric" />
          </Field>
          <Field label="Alternate mobile">
            <Input value={values.altMobile} onChange={(e) => set("altMobile", e.target.value)} />
          </Field>
          <Field label="PIN code">
            <Input value={values.pinCode} onChange={(e) => set("pinCode", e.target.value)} placeholder="262001" inputMode="numeric" maxLength={6} />
          </Field>
          <Field label="Assigned staff" hint={staffOptions.length ? "Field staff jo customer handle karega" : "Aapko assign kiya jayega"}>
            <Select value={values.assignedStaffId} onChange={(e) => set("assignedStaffId", e.target.value)}>
              <option value="">{staffOptions.length ? "Unassigned" : "Myself"}</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} — {s.designation}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-navy-900">Address</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="State">
            <Input value={values.state} onChange={(e) => set("state", e.target.value)} />
          </Field>
          <Field label="District">
            <Input value={values.district} onChange={(e) => set("district", e.target.value)} />
          </Field>
          <Field label="Tehsil">
            <Input value={values.tehsil} onChange={(e) => set("tehsil", e.target.value)} />
          </Field>
          <Field label="Village">
            <Input value={values.village} onChange={(e) => set("village", e.target.value)} />
          </Field>
          <Field label="Full address" className="sm:col-span-2 lg:col-span-4">
            <Textarea value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="House no, mohalla, landmark…" />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-navy-900">Electricity connection</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Consumer number" hint="Electricity bill par likha number">
            <Input value={values.consumerNumber} onChange={(e) => set("consumerNumber", e.target.value)} />
          </Field>
          <Field label="DISCOM">
            <Select value={values.discom} onChange={(e) => set("discom", e.target.value)}>
              {DISCOMS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Connection type">
            <Select value={values.connectionType} onChange={(e) => set("connectionType", e.target.value)}>
              {CONNECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Sanctioned load">
            <Input value={values.sanctionedLoad} onChange={(e) => set("sanctionedLoad", e.target.value)} placeholder="e.g. 2 kW" />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-navy-900">Solar requirement</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Solar capacity (kW)" required>
            <Input type="number" min={0} step={0.5} value={values.capacityKw} onChange={(e) => set("capacityKw", e.target.value)} />
          </Field>
          <Field label="Quoted system cost (₹)" hint={`Default ₹${defaultCostPerKw}/kW se auto-filled`}>
            <Input
              type="number"
              min={0}
              step={1000}
              value={values.systemCost}
              onChange={(e) => {
                setCostTouched(true);
                set("systemCost", e.target.value);
              }}
            />
          </Field>
          <Field label="Application date">
            <Input type="date" value={values.applicationDate} onChange={(e) => set("applicationDate", e.target.value)} />
          </Field>
          {mode === "edit" ? (
            <Field label="Application status" hint="Status history automatically record hogi">
              <Select value={values.status} onChange={(e) => set("status", e.target.value)}>
                {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Initial status">
              <Input value="New Customer" disabled />
            </Field>
          )}
        </div>
        <div className="mt-4">
          <Field label="Remarks">
            <Textarea value={values.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Any special note about the customer / site…" />
          </Field>
        </div>
      </Card>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? <UserPlus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : mode === "create" ? "Create customer" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <p className="text-[11px] text-slate-400">
          Customer ID automatically generate hogi. Documents create karne ke baad upload kar sakte hain.
        </p>
      </div>
    </form>
  );
}
