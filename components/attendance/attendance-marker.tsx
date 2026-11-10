"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, Save } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import { ATTENDANCE_STATUSES, ATTENDANCE_LABELS } from "@/lib/constants";

type StaffRow = { id: string; fullName: string; designation: string; employeeId: string };
type Entry = { status: string; checkIn: string; checkOut: string; overtimeHours: string; note: string };

export function AttendanceMarker({
  staff,
  date,
  existing,
  canManage,
}: {
  staff: StaffRow[];
  date: string;
  existing: Record<string, { status: string; checkIn: string | null; checkOut: string | null; overtimeHours: number; note: string | null }>;
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(
      staff.map((s) => {
        const e = existing[s.id];
        return [
          s.id,
          {
            status: e?.status || "PRESENT",
            checkIn: e?.checkIn || "09:45",
            checkOut: e?.checkOut || "18:15",
            overtimeHours: String(e?.overtimeHours ?? 0),
            note: e?.note || "",
          },
        ];
      }),
    ),
  );
  const [saving, setSaving] = useState(false);

  function set(staffId: string, key: keyof Entry, value: string) {
    setEntries((prev) => ({ ...prev, [staffId]: { ...prev[staffId], [key]: value } }));
  }

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(entries).forEach((e) => {
      counts[e.status] = (counts[e.status] || 0) + 1;
    });
    return counts;
  }, [entries]);

  async function save() {
    if (!canManage) return;
    setSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          entries: staff.map((s) => ({
            staffId: s.id,
            status: entries[s.id].status,
            checkIn: entries[s.id].checkIn || undefined,
            checkOut: entries[s.id].checkOut || undefined,
            overtimeHours: Number(entries[s.id].overtimeHours) || 0,
            note: entries[s.id].note || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save attendance.");
      toast.push("success", "Attendance saved", `${data.count} staff records updated.`);
      router.refresh();
    } catch (err) {
      toast.push("error", "Save failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  function markAllPresent() {
    setEntries((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, e]) => [id, { ...e, status: "PRESENT" }]),
      ),
    );
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div>
          <h3 className="text-sm font-bold text-navy-900">Mark attendance</h3>
          <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
            {Object.entries(summary).map(([k, v]) => (
              <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                {ATTENDANCE_LABELS[k] || k}: {v}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {canManage ? (
            <>
              <Button size="sm" variant="outline" onClick={markAllPresent}>
                <CheckCheck className="h-3.5 w-3.5" /> All present
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save attendance
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Status</th>
              <th>Check in</th>
              <th>Check out</th>
              <th className="text-right">OT hrs</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td>
                  <p className="text-xs font-semibold text-slate-800">{s.fullName}</p>
                  <p className="text-[10px] text-slate-400">{s.employeeId} · {s.designation}</p>
                </td>
                <td>
                  <Select
                    value={entries[s.id].status}
                    disabled={!canManage}
                    onChange={(e) => set(s.id, "status", e.target.value)}
                    className="input-sm min-w-[110px]"
                  >
                    {ATTENDANCE_STATUSES.map((st) => (
                      <option key={st} value={st}>{ATTENDANCE_LABELS[st]}</option>
                    ))}
                  </Select>
                </td>
                <td>
                  <input
                    type="time"
                    value={entries[s.id].checkIn}
                    disabled={!canManage}
                    onChange={(e) => set(s.id, "checkIn", e.target.value)}
                    className="input input-sm w-[100px]"
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={entries[s.id].checkOut}
                    disabled={!canManage}
                    onChange={(e) => set(s.id, "checkOut", e.target.value)}
                    className="input input-sm w-[100px]"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={entries[s.id].overtimeHours}
                    disabled={!canManage}
                    onChange={(e) => set(s.id, "overtimeHours", e.target.value)}
                    className="input input-sm w-[70px] text-right"
                  />
                </td>
                <td>
                  <input
                    value={entries[s.id].note}
                    disabled={!canManage}
                    onChange={(e) => set(s.id, "note", e.target.value)}
                    placeholder="Optional"
                    className="input input-sm min-w-[120px]"
                  />
                </td>
              </tr>
            ))}
            {!staff.length ? (
              <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-500">No staff available for attendance.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
