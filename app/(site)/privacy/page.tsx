import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck, EyeOff, FileLock2, UserCheck, Trash2 } from "lucide-react";
import { getCompany, phoneHref } from "@/lib/company";

export const metadata = { title: "Privacy & Data Policy" };

const points = [
  {
    icon: LockKeyhole,
    title: "Private document storage",
    text: "Aadhaar, PAN, electricity bill, bank passbook aur photographs public folder mein nahi rakhe jaate. Files private storage directory mein store hoti hain aur sirf authenticated API route se serve hoti hain.",
  },
  {
    icon: UserCheck,
    title: "Role based access",
    text: "Har staff role ke alag permissions hain. Field staff sirf apne assigned customers dekh sakta hai. Salary aur doosre staff ka personal data default roop se visible nahi hota.",
  },
  {
    icon: EyeOff,
    title: "Sensitive number masking",
    text: "Aadhaar aur bank account numbers UI mein masked dikhaye jaate hain. Full values sirf authorisation ke saath, aur zaroorat ke hisaab se access hoti hain.",
  },
  {
    icon: FileLock2,
    title: "Audit trail",
    text: "Login, document view/download, verification, salary approval aur customer status changes audit log mein record hote hain — user, time aur IP ke saath.",
  },
  {
    icon: ShieldCheck,
    title: "Password & session security",
    text: "Passwords bcrypt se hash hote hain. Sessions signed HTTP-only cookies use karte hain aur configured time ke baad automatically expire hote hain.",
  },
  {
    icon: Trash2,
    title: "Retention & correction",
    text: "Customer data business aur government scheme record-keeping ke liye rakha jaata hai. Correction ya deletion request ke liye office se sampark karein; legal retention requirements apply ho sakti hain.",
  },
];

export default async function PrivacyPage() {
  const company = await getCompany();
  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to home
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Privacy & Data Policy</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        {company.name} customer documents aur business data ko secure tarike se handle karta hai.
        Yeh policy batati hai ki data kaise collect, store, access aur protect kiya jaata hai.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {points.map((p) => (
          <div key={p.title} className="card-pad">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-solar-50 text-solar-700 ring-1 ring-inset ring-solar-100">
              <p.icon className="h-4 w-4" />
            </span>
            <h2 className="mt-3 text-sm font-bold text-navy-900">{p.title}</h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">{p.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-900">
        <strong>Note:</strong> Government subsidy portal (PM Surya Ghar / DISCOM) par application
        submit karte waqt customer ke documents aur details government systems ke saath share kiye
        jaate hain — yeh process ke liye zaroori hai aur customer ki consent se kiya jaata hai.
      </div>

      <div className="mt-8 card-pad">
        <h2 className="text-sm font-bold text-navy-900">Contact for data requests</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
          {company.address}
          <br />
          Email: <a href={`mailto:${company.email}`} className="link">{company.email}</a>
          <br />
          Phone: <a href={phoneHref(company.phone)} className="link">{company.phone}</a>
        </p>
      </div>
    </section>
  );
}
