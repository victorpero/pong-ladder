import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        court: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          500: "#E11D2E",
          700: "#B91C1C",
          900: "#7F1D1D"
        },
        ink: "#111827",
        line: "#E5E7EB",
        muted: "#6B7280",
        success: "#16A34A",
        warning: "#F59E0B",
        neutral: "#64748B"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
