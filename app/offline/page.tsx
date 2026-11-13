import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "You are offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="grid min-h-screen place-items-center bg-sand px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-card">
        <div className="mb-5 flex items-center justify-center gap-2.5">
          <BrandLogo size={44} />
          <div className="text-left leading-tight">
            <p className="text-sm font-extrabold tracking-wide text-navy-950">USHA ENTERPRISES</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Solar ERP + CRM</p>
          </div>
        </div>

        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <WifiOff className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-navy-900">Aap offline hain</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Internet connection check karein aur dobara try karein. App ka shell install hai — data
          wapas online aane par load ho jayega.
        </p>

        <Link
          href="/app"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          Try again
        </Link>
        <Link href="/" className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
          Go to website
        </Link>
      </div>
    </div>
  );
}
