import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "USHA ENTERPRISES — Solar ERP",
    short_name: "USHA Solar",
    description:
      "USHA ENTERPRISES, Puranpur (Pilibhit) — solar installation, PM Surya Ghar subsidy, customer management, staff ERP and complete business operations.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#0b1f42",
    theme_color: "#0b1f42",
    lang: "en-IN",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Open the ERP dashboard",
        url: "/app",
      },
      {
        name: "Public website",
        short_name: "Website",
        description: "Solar services and enquiry",
        url: "/",
      },
      {
        name: "Subsidy calculator",
        short_name: "Subsidy",
        description: "Estimate your rooftop solar subsidy",
        url: "/calculators/subsidy",
      },
    ],
  };
}
