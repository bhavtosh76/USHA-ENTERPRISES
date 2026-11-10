import { COMPANY } from "./constants";

export type CompanyInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  gst: string;
  signatory: string;
  tagline: string;
};

export const COMPANY_FALLBACK: CompanyInfo = {
  name: COMPANY.name,
  address: COMPANY.address,
  phone: COMPANY.phone,
  email: COMPANY.email,
  gst: "",
  signatory: "Authorised Signatory",
  tagline: COMPANY.tagline,
};

export function phoneHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

export function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}
