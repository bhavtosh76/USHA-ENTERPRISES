import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "USHA Solar",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1f42",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__ushaInstallPrompt=e;window.dispatchEvent(new Event("usha-installable"));});',
          }}
        />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
