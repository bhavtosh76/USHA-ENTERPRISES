import Link from "next/link";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-sand px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
          <BrandLogo size={40} priority />
          <span className="text-left leading-tight">
            <span className="block text-sm font-extrabold tracking-wide text-navy-950">USHA ENTERPRISES</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Solar ERP + CRM</span>
          </span>
        </Link>

        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-navy-900 shadow-card ring-1 ring-slate-200">
          <SearchX className="h-8 w-8" />
        </span>
        <p className="mt-6 text-5xl font-extrabold tracking-tight text-navy-950">404</p>
        <h1 className="mt-2 text-xl font-bold text-navy-900">Yeh page nahi mila</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
          Aap jis page ko dhoondh rahe hain woh hata diya gaya hai, naam badal gaya hai, ya link
          galat hai. Neeche se dashboard ya public website par wapas jaayein.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
          >
            <Home className="h-4 w-4" /> Go to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Public website
          </Link>
        </div>
      </div>
    </div>
  );
}
