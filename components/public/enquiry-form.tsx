"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui";

export function EnquiryForm() {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    village: "",
    capacityKw: "3",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, capacityKw: Number(form.capacityKw) || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit enquiry.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit enquiry.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <p className="mt-3 text-base font-bold text-emerald-900">Dhanyavaad! Enquiry mil gayi.</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-emerald-800">
          Hamari team aapko jald hi call karegi. Aap chahein to abhi humein{" "}
          <a href="tel:+910000000000" className="font-semibold underline">
            call
          </a>{" "}
          bhi kar sakte hain.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Aapka naam</label>
          <input
            required
            className="input"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Mobile number</label>
          <input
            required
            className="input"
            placeholder="10 digit mobile"
            inputMode="numeric"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Gaon / Village</label>
          <input
            className="input"
            placeholder="Village name"
            value={form.village}
            onChange={(e) => setForm({ ...form, village: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Solar capacity</label>
          <select
            className="select"
            value={form.capacityKw}
            onChange={(e) => setForm({ ...form, capacityKw: e.target.value })}
          >
            {[1, 2, 3, 4, 5, 6, 8, 10].map((k) => (
              <option key={k} value={k}>
                {k} kW
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Message (optional)</label>
        <textarea
          className="input min-h-[76px]"
          placeholder="Aap kya jaanna chahte hain?"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {loading ? "Sending…" : "Send enquiry"}
      </Button>
      <p className="text-center text-[10px] text-slate-400">
        Aapki details sirf USHA ENTERPRISES team dekhegi. Documents is form se nahi maange jaate.
      </p>
    </form>
  );
}
