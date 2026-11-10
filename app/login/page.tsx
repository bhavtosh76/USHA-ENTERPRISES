import { Suspense } from "react";
import Link from "next/link";
import { Sun, ShieldCheck, LockKeyhole, ArrowLeft, CheckCircle2 } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { getCompany } from "@/lib/company";

export const metadata = { title: "Secure Login" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const company = await getCompany();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy-950 p-10 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-solar-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-navy-500/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-solar-500 shadow-lg shadow-solar-900/40">
            <Sun className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-extrabold tracking-wide">{company.name}</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Solar ERP + CRM</p>
          </div>
        </div>

        <div className="relative my-auto max-w-md">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-solar-300 ring-1 ring-inset ring-white/10">
            <ShieldCheck className="h-3.5 w-3.5" /> Role based secure access
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white">
            Apni poori solar business, <span className="text-solar-400">ek dashboard</span> se chalayein.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Staff, customers, documents, government subsidy, installations, payroll aur finance —
            sab kuch ek hi secure platform par. Field staff mobile se kaam karein, owner har
            activity par nazar rakhein.
          </p>
          <ul className="mt-7 space-y-3 text-sm text-slate-300">
            {[
              "Customer documents with verification & masking",
              "Automatic attendance-based payroll",
              "Configurable subsidy rules — no hardcoded rates",
              "Audit logs for every sensitive action",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-solar-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-slate-500">
          {company.address}
        </p>
      </div>

      <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to website
          </Link>

          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-white">
              <Sun className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold tracking-wide text-navy-900">{company.name}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Solar ERP + CRM</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-navy-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your workspace. <span className="text-slate-400">Staff ID aur password use karein.</span>
          </p>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-slate-100" />}>
              <LoginForm />
            </Suspense>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-100/70 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Access is restricted to authorised {company.name} staff. Passwords are hashed with
              bcrypt and every login is logged with IP address.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
