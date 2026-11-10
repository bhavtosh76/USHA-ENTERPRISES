"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wrench, X } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import {
  INSPECTION_STATUSES,
  INSTALLATION_STATUSES,
  NET_METER_STATUSES,
} from "@/lib/constants";
import { toInputDate } from "@/lib/utils";

export type InstallationRecord = {
  id: string;
  customerId: string;
  customerName: string;
  capacityKw: number;
  installationDate: string | null;
  teamLeadId: string | null;
  teamMembers: string | null;
  inverterBrand: string | null;
  inverterModel: string | null;
  inverterSerial: string | null;
  panelBrand: string | null;
  panelModel: string | null;
  panelCount: number | null;
  panelSerials: string | null;
  inspectionStatus: string;
  inspectionDate: string | null;
  netMeterStatus: string;
  netMeterDate: string | null;
  completionStatus: string;
  remarks: string | null;
};

export function InstallationDialog({
  installation,
  customers,
  staff,
  defaultCustomerId,
  label = "Edit",
}: {
  installation?: InstallationRecord;
  customers: { id: string; fullName: string; customerCode: string; capacityKw: number }[];
  staff: { id: string; fullName: string }[];
  defaultCustomerId?: string;
  label?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(Boolean(defaultCustomerId && !installation));
  const [customerId, setCustomerId] = useState(installation?.customerId || defaultCustomerId || "");
  const [capacityKw, setCapacityKw] = useState(String(installation?.capacityKw ?? 0));
  const [installationDate, setInstallationDate] = useState(toInputDate(installation?.installationDate));
  const [teamLeadId, setTeamLeadId] = useState(installation?.teamLeadId || "");
  const [teamMembers, setTeamMembers] = useState(installation?.teamMembers || "");
  const [inverterBrand, setInverterBrand] = useState(installation?.inverterBrand || "");
  const [inverterModel, setInverterModel] = useState(installation?.inverterModel || "");
  const [inverterSerial, setInverterSerial] = useState(installation?.inverterSerial || "");
  const [panelBrand, setPanelBrand] = useState(installation?.panelBrand || "");
  const [panelModel, setPanelModel] = useState(installation?.panelModel || "");
  const [panelCount, setPanelCount] = useState(String(installation?.panelCount ?? ""));
  const [panelSerials, setPanelSerials] = useState(installation?.panelSerials || "");
  const [inspectionStatus, setInspectionStatus] = useState(installation?.inspectionStatus || "PENDING");
  const [inspectionDate, setInspectionDate] = useState(toInputDate(installation?.inspectionDate));
  const [netMeterStatus, setNetMeterStatus] = useState(installation?.netMeterStatus || "PENDING");
  const [netMeterDate, setNetMeterDate] = useState(toInputDate(installation?.netMeterDate));
  const [completionStatus, setCompletionStatus] = useState(installation?.completionStatus || "PENDING");
  const [remarks, setRemarks] = useState(installation?.remarks || "");
  const [saving, setSaving] = useState(false);

  function pickCustomer(id: string) {
    setCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found && (!capacityKw || Number(capacityKw) === 0)) setCapacityKw(String(found.capacityKw));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/installations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          capacityKw: Number(capacityKw) || 0,
          installationDate: installationDate || null,
          teamLeadId: teamLeadId || null,
          teamMembers: teamMembers || null,
          inverterBrand: inverterBrand || null,
          inverterModel: inverterModel || null,
          inverterSerial: inverterSerial || null,
          panelBrand: panelBrand || null,
          panelModel: panelModel || null,
          panelCount: panelCount ? Number(panelCount) : null,
          panelSerials: panelSerials || null,
          inspectionStatus,
          inspectionDate: inspectionDate || null,
          netMeterStatus,
          netMeterDate: netMeterDate || null,
          completionStatus,
          remarks: remarks || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Installation save nahi hui.");
      toast.push("success", "Installation saved", data.customerStatus ? `Customer status: ${data.customerStatus}` : "Details updated.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.push("error", "Save failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant={installation ? "outline" : "primary"} onClick={() => setOpen(true)}>
        <Wrench className="h-3.5 w-3.5" /> {label}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form onSubmit={submit} className="relative my-6 w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-pop">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">{installation ? "Update installation" : "New installation"}</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">Panel, inverter, inspection aur net metering record.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Customer" required className="sm:col-span-2 lg:col-span-2">
                <Select value={customerId} onChange={(e) => pickCustomer(e.target.value)} required disabled={Boolean(installation)}>
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.fullName} · {c.customerCode} · {c.capacityKw} kW</option>
                  ))}
                </Select>
              </Field>
              <Field label="Capacity (kW)" required>
                <Input type="number" min={0} step="0.01" value={capacityKw} onChange={(e) => setCapacityKw(e.target.value)} />
              </Field>
              <Field label="Installation date">
                <Input type="date" value={installationDate} onChange={(e) => setInstallationDate(e.target.value)} />
              </Field>
              <Field label="Team lead">
                <Select value={teamLeadId} onChange={(e) => setTeamLeadId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </Select>
              </Field>
              <Field label="Team members" hint="Comma separated names">
                <Input value={teamMembers} onChange={(e) => setTeamMembers(e.target.value)} />
              </Field>

              <Field label="Inverter brand">
                <Input value={inverterBrand} onChange={(e) => setInverterBrand(e.target.value)} placeholder="e.g. Growatt" />
              </Field>
              <Field label="Inverter model">
                <Input value={inverterModel} onChange={(e) => setInverterModel(e.target.value)} />
              </Field>
              <Field label="Inverter serial no.">
                <Input value={inverterSerial} onChange={(e) => setInverterSerial(e.target.value)} />
              </Field>
              <Field label="Panel brand">
                <Input value={panelBrand} onChange={(e) => setPanelBrand(e.target.value)} />
              </Field>
              <Field label="Panel model">
                <Input value={panelModel} onChange={(e) => setPanelModel(e.target.value)} />
              </Field>
              <Field label="Panel count">
                <Input type="number" min={0} value={panelCount} onChange={(e) => setPanelCount(e.target.value)} />
              </Field>
              <Field label="Panel serials" className="sm:col-span-2 lg:col-span-3">
                <Input value={panelSerials} onChange={(e) => setPanelSerials(e.target.value)} placeholder="Serial numbers" />
              </Field>

              <Field label="Inspection status">
                <Select value={inspectionStatus} onChange={(e) => setInspectionStatus(e.target.value)}>
                  {INSPECTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Inspection date">
                <Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
              </Field>
              <Field label="Net meter status">
                <Select value={netMeterStatus} onChange={(e) => setNetMeterStatus(e.target.value)}>
                  {NET_METER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Net meter date">
                <Input type="date" value={netMeterDate} onChange={(e) => setNetMeterDate(e.target.value)} />
              </Field>
              <Field label="Completion status">
                <Select value={completionStatus} onChange={(e) => setCompletionStatus(e.target.value)}>
                  {INSTALLATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Remarks">
                <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </Field>
            </div>

            <div className="mx-5 mb-4 rounded-md bg-sky-50 px-3 py-2 text-[11px] text-sky-800">
              Completion = COMPLETED hone par customer automatically “Installation Completed” ho jayega.
              Net meter APPROVED hone par “Subsidy Pending” stage set hogi.
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !customerId}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                Save installation
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
