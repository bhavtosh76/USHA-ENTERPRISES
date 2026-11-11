"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/toast";

export type CompanySettings = {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_gst: string;
  company_signatory: string;
  subsidy_disclaimer: string;
  default_working_days: string;
  overtime_rate: string;
  default_system_cost_per_kw: string;
  notify_email: string;
  notify_whatsapp: string;
};

export function CompanyForm({ initial }: { initial: CompanySettings }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  function set(key: keyof CompanySettings, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          default_working_days: Number(form.default_working_days) || 26,
          overtime_rate: Number(form.overtime_rate) || 0,
          default_system_cost_per_kw: Number(form.default_system_cost_per_kw) || 70000,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Settings save nahi hui.");
      toast.push("success", "Settings saved", "Company details, payroll defaults aur subsidy disclaimer update ho gaye.");
      router.refresh();
    } catch (err) {
      toast.push("error", "Save failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company name" required>
          <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} required />
        </Field>
        <Field label="GSTIN" hint="Optional">
          <Input value={form.company_gst} onChange={(e) => set("company_gst", e.target.value)} />
        </Field>
        <Field label="Company address" required className="sm:col-span-2">
          <Textarea value={form.company_address} onChange={(e) => set("company_address", e.target.value)} required />
        </Field>
        <Field label="Phone" required>
          <Input value={form.company_phone} onChange={(e) => set("company_phone", e.target.value)} required />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.company_email} onChange={(e) => set("company_email", e.target.value)} required />
        </Field>
        <Field label="Authorised signatory">
          <Input value={form.company_signatory} onChange={(e) => set("company_signatory", e.target.value)} />
        </Field>
        <Field label="Notification email" hint="Enquiry alerts ke liye">
          <Input value={form.notify_email} onChange={(e) => set("notify_email", e.target.value)} />
        </Field>
        <Field label="Notification WhatsApp" hint="Optional number">
          <Input value={form.notify_whatsapp} onChange={(e) => set("notify_whatsapp", e.target.value)} />
        </Field>
        <Field label="Default working days" hint="Payroll per-day rate ke liye">
          <Input type="number" min={1} max={31} value={form.default_working_days} onChange={(e) => set("default_working_days", e.target.value)} />
        </Field>
        <Field label="Overtime rate (₹ / hour)">
          <Input type="number" min={0} value={form.overtime_rate} onChange={(e) => set("overtime_rate", e.target.value)} />
        </Field>
        <Field label="Default system cost (₹ / kW)" hint="Public subsidy calculator default">
          <Input type="number" min={0} step={1000} value={form.default_system_cost_per_kw} onChange={(e) => set("default_system_cost_per_kw", e.target.value)} />
        </Field>
        <Field label="Subsidy disclaimer" className="sm:col-span-2">
          <Textarea value={form.subsidy_disclaimer} onChange={(e) => set("subsidy_disclaimer", e.target.value)} />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save settings
        </Button>
      </div>
    </form>
  );
}
