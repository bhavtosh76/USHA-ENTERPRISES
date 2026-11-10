"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { formatDateTime } from "@/lib/utils";

export type ResetRequestRow = {
  id: string;
  email: string;
  userName: string | null;
  createdAt: string;
};

export function PasswordResetRequests({ requests }: { requests: ResetRequestRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busyId, setBusyId] = useState("");

  if (!requests.length) return null;

  async function resolve(request: ResetRequestRow) {
    const password = window.prompt(
      `New temporary password for ${request.userName || request.email}\n(min 8 chars, letter + number):`,
    );
    if (!password) return;
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.push("error", "Weak password", "Minimum 8 characters, ek letter aur ek number chahiye.");
      return;
    }
    setBusyId(request.id);
    try {
      const res = await fetch(`/api/password-reset-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESOLVE", password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed.");
      toast.push(
        "success",
        "Password reset",
        `${request.userName || request.email} ko temporary password share karein. First login par change mandatory hoga.`,
      );
      router.refresh();
    } catch (err) {
      toast.push("error", "Reset failed", err instanceof Error ? err.message : undefined);
    } finally {
      setBusyId("");
    }
  }

  async function dismiss(request: ResetRequestRow) {
    if (!window.confirm(`Dismiss reset request from ${request.email}?`)) return;
    setBusyId(request.id);
    try {
      const res = await fetch(`/api/password-reset-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISMISS" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not dismiss request.");
      toast.push("success", "Request dismissed", request.email);
      router.refresh();
    } catch (err) {
      toast.push("error", "Action failed", err instanceof Error ? err.message : undefined);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
          <ShieldAlert className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-900">
            {requests.length} pending password reset request{requests.length > 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-800">
            Login page se aayi requests. Identity verify karke temporary password set karein.
          </p>
          <div className="mt-3 divide-y divide-amber-200/70 rounded-lg border border-amber-200 bg-white">
            {requests.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-navy-900">
                    {request.userName || "Unknown user"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {request.email} · {formatDateTime(request.createdAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => resolve(request)}
                  disabled={busyId === request.id}
                >
                  {busyId === request.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  Set password
                </Button>
                <button
                  type="button"
                  onClick={() => dismiss(request)}
                  disabled={busyId === request.id}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  title="Dismiss request"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
