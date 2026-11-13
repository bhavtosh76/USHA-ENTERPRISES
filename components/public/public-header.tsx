"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Phone, X, Mail, MapPin } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { phoneHref, type CompanyInfo } from "@/lib/company-shared";

const links = [
  { href: "/#services", label: "Services" },
  { href: "/#process", label: "Process" },
  { href: "/calculators/subsidy", label: "Subsidy Calculator" },
  { href: "/calculators/emi", label: "EMI Calculator" },
  { href: "/#contact", label: "Contact" },
];

export function PublicHeader({ company }: { company: CompanyInfo }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="hidden bg-navy-950 text-white sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1.5 text-[11px]">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-solar-400" /> {company.address}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <a href={`mailto:${company.email}`} className="inline-flex items-center gap-1.5 hover:text-white">
              <Mail className="h-3 w-3 text-solar-400" /> {company.email}
            </a>
            <a href={phoneHref(company.phone)} className="inline-flex items-center gap-1.5 hover:text-white">
              <Phone className="h-3 w-3 text-solar-400" /> {company.phone}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandLogo size={40} priority />
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-wide text-navy-900">{company.name}</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Solar Installation & Management
            </p>
          </div>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-navy-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            href="/login"
            className="hidden rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-slate-50 sm:inline-flex"
          >
            Staff Login
          </Link>
          <Link
            href="/#contact"
            className="hidden rounded-lg bg-solar-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-solar-700 sm:inline-flex"
          >
            Free Site Survey
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg bg-navy-950 px-3 py-2.5 text-center text-sm font-semibold text-white"
            >
              Staff Login
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
