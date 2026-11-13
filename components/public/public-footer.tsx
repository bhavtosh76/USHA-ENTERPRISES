import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { phoneHref, type CompanyInfo } from "@/lib/company-shared";

export function PublicFooter({ company }: { company: CompanyInfo }) {
  return (
    <footer className="bg-navy-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <BrandLogo size={40} />
            <div>
              <p className="text-sm font-extrabold tracking-wide text-white">{company.name}</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">Solar ERP + CRM</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            Residential rooftop solar installation, government subsidy assistance and complete
            documentation support in Puranpur, Pilibhit and nearby villages.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-slate-300 ring-1 ring-inset ring-white/10">
            <ShieldCheck className="h-3 w-3 text-solar-400" /> Secure customer documentation
          </p>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white">Services</p>
          <ul className="space-y-2 text-xs">
            {[
              "Residential Solar Installation",
              "PM Surya Ghar Subsidy Support",
              "Government Documentation",
              "Net Metering Assistance",
              "Installation & Maintenance",
              "Solar Finance Guidance",
            ].map((s) => (
              <li key={s} className="text-slate-400">{s}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white">Quick Links</p>
          <ul className="space-y-2 text-xs">
            <li><Link href="/calculators/subsidy" className="hover:text-white">Subsidy Calculator</Link></li>
            <li><Link href="/calculators/emi" className="hover:text-white">Bank / EMI Calculator</Link></li>
            <li><Link href="/#process" className="hover:text-white">Installation Process</Link></li>
            <li><Link href="/#documents" className="hover:text-white">Document Checklist</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy & Data Policy</Link></li>
            <li><Link href="/login" className="hover:text-white">Staff Login</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white">Contact</p>
          <ul className="space-y-3 text-xs">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-solar-400" />
              <span className="text-slate-400">{company.address}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-solar-400" />
              <a href={phoneHref(company.phone)} className="hover:text-white">{company.phone}</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-solar-400" />
              <a href={`mailto:${company.email}`} className="hover:text-white">{company.email}</a>
            </li>
          </ul>
          <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
            Office hours: Monday – Saturday, 9:30 AM – 6:30 PM IST
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-4 text-[10px] text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {company.name}. All rights reserved.</p>
          <p>
            Subsidy amounts are estimates subject to Government approval. Not an official Government website.
          </p>
        </div>
      </div>
    </footer>
  );
}
