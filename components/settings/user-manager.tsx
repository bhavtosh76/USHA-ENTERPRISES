"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Pencil, Plus, ShieldCheck, UserX, X } from "lucide-react";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import { formatDateTime } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  staffName: string | null;
};

type RoleOption = { key: string; name: string };

export function UserManager({
  users,
  roles,
  currentUserId,
  currentRoleKey,
}: {
  users: UserRow[];
  roles: RoleOption[];
  currentUserId: string;
  currentRoleKey: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("FIELD_STAFF");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  const assignableRoles = roles.filter((r) => currentRoleKey === "SUPER_ADMIN" || r.key !== "SUPER_ADMIN");

  function openCreate() {
    setMode("create");
    setTarget(null);
    setName("");
    setEmail("");
    setRoleKey("FIELD_STAFF");
    setPassword("");
    setIsActive(true);
  }

  function openEdit(user: UserRow) {
    setMode("edit");
    setTarget(user);
    setName(user.name);
    setEmail(user.email);
    setRoleKey(user.roleKey);
    setPassword("");
    setIsActive(user.isActive);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name, email, roleKey, isActive };
      if (password) body.password = password;
      const res = await fetch(mode === "create" ? "/api/users" : `/api/users/${target?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "create" ? { ...body, password } : body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "User save nahi hua.");
      toast.push("success", mode === "create" ? "User created" : "User updated", "Changes apply ho gaye.");
      setMode(null);
      router.refresh();
    } catch (err) {
      toast.push("error", "Save failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserRow) {
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");
      toast.push("success", user.isActive ? "User deactivated" : "User activated", user.email);
      router.refresh();
    } catch (err) {
      toast.push("error", "Update failed", err instanceof Error ? err.message : undefined);
    } finally {
      setBusyId("");
    }
  }

  async function resetPassword(user: UserRow) {
    const next = window.prompt(`New password for ${user.name} (min 8 chars):`);
    if (!next) return;
    if (next.length < 8) {
      toast.push("error", "Password too short", "Minimum 8 characters required.");
      return;
    }
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed.");
      toast.push("success", "Password reset", `${user.name} ko naya password share karein.`);
      router.refresh();
    } catch (err) {
      toast.push("error", "Reset failed", err instanceof Error ? err.message : undefined);
    } finally {
      setBusyId("");
    }
  }

  async function removeUser(user: UserRow) {
    if (!window.confirm(`Deactivate login for ${user.name}?`)) return;
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not deactivate user.");
      toast.push("success", "Login deactivated", user.email);
      router.refresh();
    } catch (err) {
      toast.push("error", "Action failed", err instanceof Error ? err.message : undefined);
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add user
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Linked staff</th>
              <th>Last login</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <p className="font-semibold text-navy-900">{u.name}</p>
                  <p className="text-[10px] text-slate-400">{u.email}</p>
                  {u.mustChangePassword ? <span className="text-[10px] font-semibold text-amber-600">Password change pending</span> : null}
                </td>
                <td><Badge tone={u.roleKey === "SUPER_ADMIN" ? "danger" : u.roleKey === "ADMIN" ? "brand" : "info"}>{u.roleName}</Badge></td>
                <td className="text-xs">{u.staffName || <span className="text-slate-400">No staff profile</span>}</td>
                <td className="whitespace-nowrap text-[11px] text-slate-500">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                <td><Badge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? "Active" : "Inactive"}</Badge></td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" title="Edit user">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => resetPassword(u)} disabled={busyId === u.id} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" title="Reset password">
                      {busyId === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                    </button>
                    {u.id !== currentUserId ? (
                      <>
                        <button onClick={() => toggleActive(u)} disabled={busyId === u.id} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" title={u.isActive ? "Deactivate" : "Activate"}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button>
                        {!u.staffName ? (
                          <button onClick={() => removeUser(u)} disabled={busyId === u.id} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600" title="Deactivate login">
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <span className="px-1 text-[10px] text-slate-400">You</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mode ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setMode(null)} />
          <form onSubmit={submit} className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-pop">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-sm font-bold text-navy-900">{mode === "create" ? "Create login" : `Edit ${target?.name}`}</h3>
              <button type="button" onClick={() => setMode(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" required className="sm:col-span-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={3} />
              </Field>
              <Field label="Email" required className="sm:col-span-2">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Field>
              <Field label="Role" required>
                <Select value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
                  {assignableRoles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={isActive ? "1" : "0"} onChange={(e) => setIsActive(e.target.value === "1")}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </Select>
              </Field>
              <Field label={mode === "create" ? "Password" : "New password (optional)"} required={mode === "create"} className="sm:col-span-2" hint="Minimum 8 characters">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={mode === "create"} minLength={8} autoComplete="new-password" />
              </Field>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
              Naya user ya password reset hone par first login par password change mandatory hoga.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setMode(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {mode === "create" ? "Create user" : "Save changes"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
