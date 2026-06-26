import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        court: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          500: "#14b8a6",
          700: "#0f766e",
          900: "#134e4a"
        },
        ink: "#17211f",
        line: "#d9e4df"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(23, 33, 31, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

