"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Mail, Send, ShieldCheck } from "lucide-react";
import { Button, LinkButton } from "./ui";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Request bhejne mein dikkat aayi. Please try again.");
        setLoading(false);
        return;
      }
      setMessage(data.message || "Reset request admin ko bhej di gayi hai.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (message) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Request submitted</p>
            <p className="mt-1 text-[11px] leading-relaxed text-emerald-800">{message}</p>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Security ke liye hum batate hain: password email par nahi bheja jata. Admin aapki
          identity verify karke naya temporary password dega, jise first login par change karna hoga.
        </p>
        <LinkButton href="/login" variant="outline" className="w-full">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </LinkButton>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="reset-email">
          Registered email address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="reset-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@ushaenterprises.in"
            className="input pl-9"
          />
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          Wahi email daalein jo aapke staff login se linked hai.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {loading ? "Sending request…" : "Send reset request to admin"}
      </Button>

      <div className="flex items-start gap-2 rounded-lg bg-slate-100/70 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Request Settings → Users mein admin ko dikhegi. Email enumeration se bachne ke liye
          screen par hamesha same confirmation message dikhta hai.
        </span>
      </div>

      <p className="text-center text-[11px] text-slate-400">
        <Link href="/login" className="link">
          <ArrowLeft className="mr-1 inline h-3 w-3" /> Back to sign in
        </Link>
      </p>
    </form>
  );
}
