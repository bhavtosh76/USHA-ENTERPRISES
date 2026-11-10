import Link from "next/link";
import { Sun, ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { getCompany } from "@/lib/company";

export const metadata = { title: "Forgot Password" };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const company = await getCompany();
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-5 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-900 text-white">
            <Sun className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold tracking-wide text-navy-900">{company.name}</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Solar ERP + CRM</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h1 className="text-xl font-bold text-navy-900">Forgot password?</h1>
          <p className="mt-1 mb-5 text-xs leading-relaxed text-slate-500">
            Apna registered email daalein. Admin ko reset request jayegi aur wo aapko naya
            temporary password dega.
          </p>
          <ForgotPasswordForm />
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-400">
          {company.name} · Authorised staff only
        </p>
      </div>
    </div>
  );
}
