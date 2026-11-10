import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef3fb",
          100: "#d8e3f5",
          200: "#b3c7ea",
          300: "#7fa2d9",
          400: "#4a77c2",
          500: "#2c57a6",
          600: "#1f4388",
          700: "#17356d",
          800: "#102a57",
          900: "#0b1f42",
          950: "#07142c",
        },
        solar: {
          50: "#effaf2",
          100: "#d8f3e0",
          200: "#b3e7c5",
          300: "#80d3a2",
          400: "#4ab87c",
          500: "#269c5f",
          600: "#197d4b",
          700: "#15633e",
          800: "#144f33",
          900: "#12412b",
          950: "#082417",
        },
        sand: "#f5f7fa",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI",
          "Noto Sans Devanagari",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,31,66,0.06), 0 8px 24px -12px rgba(11,31,66,0.18)",
        pop: "0 24px 60px -20px rgba(7,20,44,0.35)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up .35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
