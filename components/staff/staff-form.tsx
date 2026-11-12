"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, UserPlus } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/toast";
import { DEPARTMENTS, DESIGNATIONS } from "@/lib/constants";

type DesignationOption = { name: string; level: number };

export type StaffFormValues = {
  fullName: string;
  mobile: string;
  altMobile: string;
  email: string;
  address: string;
  joiningDate: string;
  designation: string;
  department: string;
  monthlySalary: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  targetMonthly: string;
  incentiveRate: string;
  commissionRate: string;
  area: string;
  reportsToId: string;
  status: string;
  notes: string;
  roleKey: string;
  password: string;
};

const empty: StaffFormValues = {
  fullName: "",
  mobile: "",
  altMobile: "",
  email: "",
  address: "",
  joiningDate: new Date().toISOString().slice(0, 10),
  designation: "Field Executive",
  department: "Field Operations",
  monthlySalary: "15000",
  bankName: "",
  bankAccount: "",
  bankIfsc: "",
  targetMonthly: "0",
  incentiveRate: "0",
  commissionRate: "0",
  area: "",
  reportsToId: "",
  status: "ACTIVE",
  notes: "",
  roleKey: "FIELD_STAFF",
  password: "",
};

export function StaffForm({
  roles,
  managers,
  designations,
  departments,
  mode = "create",
  staffId,
  initial,
}: {
  roles: { key: string; name: string }[];
  managers: { id: string; fullName: string; designation: string; level?: number }[];
  designations?: DesignationOption[];
  departments?: string[];
  mode?: "create" | "edit";
  staffId?: string;
  initial?: Partial<StaffFormValues>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<StaffFormValues>({ ...empty, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const designationList = designations?.length ? designations : DESIGNATIONS.map((name, i) => ({ name, level: 50 - i }));
  const departmentList = departments?.length ? departments : [...DEPARTMENTS];
  const selectedLevel = designationList.find((d) => d.name === values.designation)?.level ?? 50;
  const eligibleManagers = managers.filter(
    (m) => m.id !== staffId && (m.level === undefined || m.level > selectedLevel),
  );

  function set<K extends keyof StaffFormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (values.fullName.trim().length < 3) return setError("Employee ka poora naam likhein.");
    if (!/^[0-9+\-\s]{10,15}$/.test(values.mobile.trim())) return setError("Valid mobile number daalein.");
    if (!values.email.trim()) return setError("Login ke liye email zaroori hai.");
    if (mode === "create" && values.password.length < 8) return setError("Password kam se kam 8 characters ka hona chahiye.");

    setSaving(true);
    try {
      const payload = {
        ...values,
        monthlySalary: Number(values.monthlySalary) || 0,
        targetMonthly: Number(values.targetMonthly) || 0,
        incentiveRate: Number(values.incentiveRate) || 0,
        commissionRate: Number(values.commissionRate) || 0,
        reportsToId: values.reportsToId || null,
        password: values.password || undefined,
      };
      const res = await fetch(mode === "create" ? "/api/staff" : `/api/staff/${staffId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.details?.fieldErrors ? Object.values(data.details.fieldErrors).flat().join(" ") : "";
        throw new Error(detail || data.error || "Could not save staff.");
      }
      toast.push("success", mode === "create" ? "Staff created" : "Staff updated", "Login account and profile saved.");
      router.push(`/app/staff/${data.staff?.id || staffId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save staff.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-navy-900">Employee profile</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full name" required>
            <Input value={values.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </Field>
          <Field label="Mobile number" required>
            <Input value={values.mobile} onChange={(e) => set("mobile", e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Alternate mobile">
            <Input value={values.altMobile} onChange={(e) => set("altMobile", e.target.value)} />
          </Field>
          <Field label="Joining date" required>
            <Input type="date" value={values.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} />
          </Field>
          <Field label="Designation" required hint={selectedLevel ? `Level ${selectedLevel}` : undefined}>
            <Select value={values.designation} onChange={(e) => set("designation", e.target.value)}>
              {designationList.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Department">
            <Select value={values.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">—</option>
              {departmentList.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Work area">
            <Input value={values.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Puranpur" />
          </Field>
          <Field label="Reports to" hint="Only senior designations are listed">
            <Select value={values.reportsToId} onChange={(e) => set("reportsToId", e.target.value)}>
              <option value="">—</option>
              {eligibleManagers.map((m) => (
                <option key={m.id} value={m.id}>{m.fullName} — {m.designation}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={values.status} onChange={(e) => set("status", e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TERMINATED">Terminated</option>
            </Select>
          </Field>
          <Field label="Full address" className="sm:col-span-2 lg:col-span-3">
            <Textarea value={values.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-navy-900">Salary & targets</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Monthly fixed salary (₹)" required>
            <Input type="number" min={0} step={500} value={values.monthlySalary} onChange={(e) => set("monthlySalary", e.target.value)} />
          </Field>
          <Field label="Monthly target (₹)" hint="Sales/revenue target">
            <Input type="number" min={0} step={1000} value={values.targetMonthly} onChange={(e) => set("targetMonthly", e.target.value)} />
          </Field>
          <Field label="Incentive rate (%)" hint="On target achievement">
            <Input type="number" min={0} max={100} step={0.1} value={values.incentiveRate} onChange={(e) => set("incentiveRate", e.target.value)} />
          </Field>
          <Field label="Commission rate (%)" hint="On customer revenue">
            <Input type="number" min={0} max={100} step={0.1} value={values.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-navy-900">Bank details</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Bank name">
            <Input value={values.bankName} onChange={(e) => set("bankName", e.target.value)} />
          </Field>
          <Field label="Account number" hint="UI par masked dikhega">
            <Input value={values.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} />
          </Field>
          <Field label="IFSC code">
            <Input value={values.bankIfsc} onChange={(e) => set("bankIfsc", e.target.value.toUpperCase())} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-bold text-navy-900">Login & role</h2>
        <p className="mb-4 text-[11px] text-slate-500">Staff isi email/password se login karega. Role ki permissions Settings se control hoti hain.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Login email" required>
            <Input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Role" required>
            <Select value={values.roleKey} onChange={(e) => set("roleKey", e.target.value)}>
              {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </Select>
          </Field>
          <Field
            label={mode === "create" ? "Temporary password" : "Reset password (optional)"}
            hint={mode === "create" ? "Minimum 8 characters" : "Blank chhodne par password unchanged"}
            required={mode === "create"}
          >
            <Input type="password" value={values.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Internal notes">
            <Textarea value={values.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </Card>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">{error}</div> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? <UserPlus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : mode === "create" ? "Create staff account" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}
