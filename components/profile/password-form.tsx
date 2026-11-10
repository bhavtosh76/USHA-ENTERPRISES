"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/toast";

export function PasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.push("error", "Passwords match nahi kar rahe", "Confirm password dobara check karein.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password change nahi hua.");
      toast.push("success", "Password changed", "Agli baar naye password se login karein.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      router.refresh();
    } catch (err) {
      toast.push("error", "Change failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Current password" required>
        <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
      </Field>
      <Field label="New password" required hint="Minimum 8 characters, letter + number">
        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password" required>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
      </Field>
      <Button type="submit" size="sm" className="w-full" disabled={saving}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
        Change password
      </Button>
    </form>
  );
}
