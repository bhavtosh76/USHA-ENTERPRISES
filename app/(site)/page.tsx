import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Gauge,
  HandCoins,
  Home,
  Landmark,
  MapPin,
  Phone,
  ShieldCheck,
  Sun,
  Wrench,
  Zap,
} from "lucide-react";
import { SubsidyCalculator } from "@/components/public/subsidy-calculator";
import { EnquiryForm } from "@/components/public/enquiry-form";
import { getCompany, phoneHref } from "@/lib/company";

export const metadata = {
  title: "USHA ENTERPRISES — Solar Installation in Puranpur, Pilibhit",
  description:
    "Residential rooftop solar installation in Puranpur, Pilibhit. PM Surya Ghar subsidy assistance, government documentation, net metering and installation management.",
};

const services = [
  {
    icon: Home,
    title: "Residential Solar Installation",
    text: "1 kW se 10 kW tak rooftop solar system — site survey, design, installation aur commissioning.",
  },
  {
    icon: HandCoins,
    title: "PM Surya Ghar Subsidy",
    text: "Central government subsidy application aur portal process mein complete guidance.",
  },
  {
    icon: FileCheck2,
    title: "Document Collection",
    text: "Aadhaar, bill, bank passbook aur photo ka secure digital record, verification ke saath.",
  },
  {
    icon: Gauge,
    title: "Net Metering Support",
    text: "DISCOM net meter application, feasibility approval aur inspection coordination.",
  },
  {
    icon: Wrench,
    title: "Installation Management",
    text: "Panel, inverter, serial number, photo aur completion report ka poora record.",
  },
  {
    icon: Banknote,
    title: "Solar Finance Guidance",
    text: "Bank loan, EMI aur subsidy cash-flow samajhne ke liye calculation support.",
  },
];

const steps = [
  { title: "Free Site Survey", text: "Ghar ki chhat, load aur shadow analysis ke baad sahi capacity suggest karte hain." },
  { title: "Documents & Application", text: "Aadhaar, electricity bill, bank details collect karke application taiyar karte hain." },
  { title: "Subsidy Approval", text: "Portal par application, DISCOM feasibility aur subsidy sanction track karte hain." },
  { title: "Installation & Net Meter", text: "Approved material se installation, inspection aur net meter coordination." },
  { title: "Subsidy Credit & Support", text: "Subsidy bank account mein aane tak follow-up aur system handover." },
];

const documents = [
  "Aadhaar Card",
  "Electricity Bill (latest)",
  "Bank Passbook / Cancelled Cheque",
  "Customer Photograph",
  "PAN Card (if required)",
  "Property / Roof ownership proof (if asked)",
];

const faqs = [
  {
    q: "PM Surya Ghar subsidy kitni milti hai?",
    a: "Central subsidy residential rooftop solar par capacity ke hisaab se milti hai — pehle 2 kW par ₹30,000/kW aur teesre kW par ₹18,000, maximum ₹78,000 tak (3 kW aur usse zyada par). Exact amount scheme rules aur approval par depend karta hai. Hamara calculator admin-configured rates se estimate dikhata hai.",
  },
  {
    q: "Kya state government ki alag subsidy hai?",
    a: "State subsidy scheme samay-samay par notify hoti hai. Hum koi bhi rate assume nahi karte — jo scheme officially notify hoti hai, wahi admin settings mein update ki jaati hai. Calculator par applicable state subsidy alag se dikhti hai.",
  },
  {
    q: "Documents kaise safe rahenge?",
    a: "Aadhaar aur bank documents private storage mein rakhe jaate hain. Sirf authorised staff, permission ke saath, documents dekh sakte hain. Sensitive numbers masked dikhaye jaate hain aur har access audit log mein record hota hai.",
  },
  {
    q: "Installation mein kitna time lagta hai?",
    a: "Feasibility approval ke baad installation usually 2–5 working days ka kaam hai. Net meter approval DISCOM par depend karta hai. Aapko har stage ka status customer portal se pata chalta hai.",
  },
  {
    q: "Kya aap loan / EMI mein help karte hain?",
    a: "Haan — bank loan options samajhne aur EMI calculation mein madad karte hain. EMI calculator se monthly installment, total interest aur amortization schedule dekh sakte hain.",
  },
];

export default async function HomePage() {
  const company = await getCompany();

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-solar-500/25 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-[380px] w-[380px] rounded-full bg-navy-500/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-solar-300 ring-1 ring-inset ring-white/10">
              <BadgeCheck className="h-3.5 w-3.5" /> PM Surya Ghar subsidy assistance · Puranpur, Pilibhit
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
              Ghar ki chhat par <span className="text-solar-400">solar</span>,<br />
              subsidy ka poora saath.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              USHA ENTERPRISES aapke ghar ke liye residential rooftop solar system lagata hai —
              site survey se lekar government subsidy, net metering aur installation tak. Har
              customer ka poora digital record, secure documentation ke saath.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="#subsidy" className="inline-flex items-center gap-2 rounded-lg bg-solar-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-solar-900/30 transition hover:bg-solar-600">
                <Zap className="h-4 w-4" /> Free subsidy estimate
              </Link>
              <a href="#contact" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Book a site survey <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-300">
              {["End-to-end documentation", "Local installation team", "Transparent estimates", "Secure data handling"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-solar-400" /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-solar-500/30 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/95 p-5 text-slate-800 shadow-pop">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Example estimate</p>
                  <p className="text-lg font-bold text-navy-900">3 kW Residential System</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-600">
                  <Sun className="h-6 w-6" />
                </span>
              </div>

              <div className="mt-4 space-y-2.5 rounded-xl bg-slate-50 p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated system cost</span>
                  <span className="font-semibold text-slate-800">₹1,65,000</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Central subsidy (up to)</span>
                  <span className="font-semibold">− ₹78,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">State subsidy</span>
                  <span className="font-medium text-slate-600">As notified</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2.5 text-sm">
                  <span className="font-semibold text-navy-900">Estimated contribution</span>
                  <span className="font-bold text-navy-900">₹87,000</span>
                </div>
              </div>

              <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
                Illustrative only. Actual cost material, brand aur site conditions par depend karta hai;
                subsidy Government approval par. Calculator se apna estimate banayein.
              </p>

              <Link href="#subsidy" className="mt-4 flex items-center justify-between rounded-lg bg-navy-950 px-4 py-3 text-xs font-semibold text-white transition hover:bg-navy-800">
                Calculate for my home <ArrowRight className="h-4 w-4 text-solar-400" />
              </Link>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/10 px-6 md:grid-cols-4">
            {[
              { value: "1–10 kW", label: "Residential capacity" },
              { value: "₹78,000", label: "Max central subsidy*" },
              { value: "25 years", label: "Typical panel life" },
              { value: "Puranpur", label: "Local support base" },
            ].map((s) => (
              <div key={s.label} className="px-4 py-5 text-center">
                <p className="text-lg font-bold text-solar-400 sm:text-xl">{s.value}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto max-w-7xl px-6 pb-3 text-[9px] text-slate-500">
            *Central subsidy cap for eligible residential systems of 3 kW and above, subject to scheme rules and Government approval.
          </p>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-solar-600">Our Services</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Solar ka poora solution, ek hi jagah</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Sirf panel lagana nahi — application, documentation, subsidy aur installation
            management tak, har step par support.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.title} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-solar-300">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-solar-50 text-solar-600 ring-1 ring-inset ring-solar-100 transition group-hover:bg-solar-600 group-hover:text-white">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-bold text-navy-900">{s.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-solar-600">How it works</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Application se installation tak, 5 clear steps</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Har customer ka apna digital file banta hai. Status, documents aur history
                ek jagah record hoti hai — isliye koi step miss nahi hota.
              </p>
              <div className="mt-6 rounded-xl border border-navy-100 bg-navy-50/60 p-4">
                <p className="flex items-center gap-2 text-xs font-bold text-navy-900">
                  <ShieldCheck className="h-4 w-4 text-solar-600" /> Documentation-first process
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
                  Aadhaar aur bank details masked view mein dikhte hain. Documents sirf authorised
                  staff verify karte hain aur har action audit log mein record hota hai.
                </p>
              </div>
            </div>

            <ol className="relative space-y-5 border-l border-slate-200 pl-7">
              {steps.map((s, i) => (
                <li key={s.title} className="relative">
                  <span className="absolute -left-[38px] grid h-6 w-6 place-items-center rounded-full bg-navy-950 text-[10px] font-bold text-white ring-4 ring-white">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-bold text-navy-900">{s.title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* SUBSIDY CALCULATOR */}
      <section id="subsidy" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-solar-600">Government Subsidy</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Apni subsidy khud calculate karein</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Rates admin settings se aate hain — koi hardcoded number nahi. Scheme change hone par
              estimate automatically update hota hai.
            </p>
          </div>
          <Link href="/calculators/subsidy" className="inline-flex items-center gap-1.5 text-xs font-semibold text-solar-700 hover:underline">
            Full calculator <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <SubsidyCalculator />
      </section>

      {/* DOCUMENTS */}
      <section id="documents" className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-solar-600">Documents</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Kya-kya documents chahiye?</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Application ke liye ye documents generally required hote hain. Exact list scheme aur
              DISCOM requirements par depend karti hai — hamari team application ke waqt confirm karti hai.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {documents.map((d) => (
                <div key={d} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs text-slate-700">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-solar-600" /> {d}
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-800">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Documents private storage mein rakhe jaate hain. Aadhaar/bank numbers masked dikhaye jaate hain
              aur download/verify actions audit log mein record hote hain.
            </div>
          </div>

          <div className="rounded-2xl bg-navy-950 p-6 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-solar-400">Why USHA</p>
            <h3 className="mt-2 text-xl font-bold text-white">Local team, proper process, digital record</h3>
            <div className="mt-5 space-y-4">
              {[
                { icon: MapPin, title: "Puranpur based", text: "Site visit aur after-installation support ke liye local team." },
                { icon: ClipboardCheck, title: "Har customer ka digital file", text: "Documents, status history aur installation details ek jagah." },
                { icon: Landmark, title: "Subsidy follow-up", text: "Application se disbursement tak status tracking." },
                { icon: Building2, title: "Business-grade records", text: "Material, serial numbers, inspection aur payment records." },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-solar-400">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">{f.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EMI CTA */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-solar-600">Finance Tools</p>
                <h2 className="mt-1.5 text-xl font-bold">EMI, interest aur repayment plan</h2>
              </div>
              <Link href="/calculators/emi" className="inline-flex items-center gap-1.5 rounded-lg bg-navy-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-navy-800">
                Open calculator <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Simple Interest", text: "Principal, rate aur time se total interest." },
                { label: "Compound Interest", text: "Monthly, quarterly ya yearly compounding." },
                { label: "Loan EMI", text: "Monthly EMI + full amortization schedule." },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                  <p className="text-xs font-bold text-navy-900">{c.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{c.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] text-slate-400">
              Calculations are mathematical estimates. Bank processing fees, insurance aur actual
              sanction terms alag ho sakte hain.
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-solar-600 to-solar-800 p-6 text-white shadow-card">
            <Sun className="h-8 w-8 text-solar-200" />
            <h3 className="mt-4 text-lg font-bold text-white">Solar lagwane ka plan banayein</h3>
            <p className="mt-2 text-xs leading-relaxed text-solar-100">
              Free site survey book karein. Hum aapki chhat, load aur budget ke hisaab se
              capacity aur estimate suggest karenge.
            </p>
            <a href={phoneHref(company.phone)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-solar-800 hover:bg-solar-50">
              <Phone className="h-3.5 w-3.5" /> Call {company.phone}
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-solar-600">FAQ</p>
            <h2 className="mt-2 text-2xl font-bold">Common questions</h2>
          </div>
          <div className="mt-8 space-y-2">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-xl border border-slate-200 bg-white px-4 py-3 open:border-solar-200 open:bg-solar-50/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-navy-900">
                  {f.q}
                  <span className="text-slate-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-solar-600">Contact</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Apne ghar ke liye solar estimate lein</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Form bharein ya direct call karein. Hamari team aapke gaon/village aur
              electricity connection ke hisaab se guide karegi.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-700">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-navy-900">Office address</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{company.address}</p>
                  <a
                    href="https://maps.google.com/?q=Ghungchai+Chauraha+Super+Market+Puranpur+Pilibhit+Uttar+Pradesh"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-solar-700 hover:underline"
                  >
                    Open in Google Maps <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <a href={phoneHref(company.phone)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card hover:border-solar-300">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-solar-50 text-solar-700"><Phone className="h-4 w-4" /></span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Call</p>
                    <p className="text-xs font-semibold text-navy-900">{company.phone}</p>
                  </div>
                </a>
                <a href={`mailto:${company.email}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card hover:border-solar-300">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-solar-50 text-solar-700"><FileCheck2 className="h-4 w-4" /></span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Email</p>
                    <p className="break-all text-xs font-semibold text-navy-900">{company.email}</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <div className="card-pad">
            <h3 className="text-sm font-bold text-navy-900">Free consultation request</h3>
            <p className="mb-4 mt-0.5 text-xs text-slate-500">Details bharein — team aapko call karegi.</p>
            <EnquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
