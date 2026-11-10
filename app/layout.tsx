import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "USHA ENTERPRISES — Solar Business Management",
    template: "%s | USHA ENTERPRISES",
  },
  description:
    "USHA ENTERPRISES, Puranpur (Pilibhit) — Residential solar installation, PM Surya Ghar subsidy assistance, customer documentation and complete solar business management.",
  applicationName: "USHA ENTERPRISES ERP",
  keywords: ["solar panel Pilibhit", "PM Surya Ghar", "solar subsidy Uttar Pradesh", "USHA ENTERPRISES"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1f42",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
