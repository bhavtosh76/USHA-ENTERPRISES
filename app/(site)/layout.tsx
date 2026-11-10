import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { MessageCircle, Phone } from "lucide-react";
import { getCompany, phoneHref, whatsappHref } from "@/lib/company";

// Company contact details come from Settings and must reflect admin edits immediately.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const company = await getCompany();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader company={company} />
      <main className="flex-1">{children}</main>
      <PublicFooter company={company} />
      <div className="no-print fixed bottom-4 right-4 z-40 flex flex-col gap-2">
        <a
          href={whatsappHref(company.phone)}
          target="_blank"
          rel="noreferrer"
          className="grid h-11 w-11 place-items-center rounded-full bg-emerald-500 text-white shadow-pop transition hover:bg-emerald-600"
          aria-label="WhatsApp"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
        <a
          href={phoneHref(company.phone)}
          className="grid h-11 w-11 place-items-center rounded-full bg-navy-900 text-white shadow-pop transition hover:bg-navy-800 sm:hidden"
          aria-label="Call"
        >
          <Phone className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
}
