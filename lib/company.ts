import "server-only";
import { prisma } from "./db";
import { COMPANY_FALLBACK, type CompanyInfo } from "./company-shared";

export type { CompanyInfo } from "./company-shared";
export { phoneHref, whatsappHref } from "./company-shared";

/**
 * Company identity for public pages, PDFs and exports.
 * Values are managed in Settings → Company so the owner never needs a code change.
 */
export async function getCompany(): Promise<CompanyInfo> {
  try {
    const rows = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "company_name",
            "company_address",
            "company_phone",
            "company_email",
            "company_gst",
            "company_signatory",
          ],
        },
      },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      name: map.company_name || COMPANY_FALLBACK.name,
      address: map.company_address || COMPANY_FALLBACK.address,
      phone: map.company_phone || COMPANY_FALLBACK.phone,
      email: map.company_email || COMPANY_FALLBACK.email,
      gst: map.company_gst || "",
      signatory: map.company_signatory || COMPANY_FALLBACK.signatory,
      tagline: COMPANY_FALLBACK.tagline,
    };
  } catch {
    // During a cold build or DB maintenance the public site still renders.
    return COMPANY_FALLBACK;
  }
}
