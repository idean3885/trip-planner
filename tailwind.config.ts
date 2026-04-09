import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      maxWidth: {
        content: "40rem",
      },
      colors: {
        // Primary accent — warm teal-blue
        primary: {
          50:  "#eff8ff",
          100: "#dbeffe",
          200: "#b9e0fd",
          300: "#7bcbfb",
          400: "#38adf6",
          500: "#0e90e0",
          600: "#0272be",
          700: "#035b9a",
          800: "#074e7f",
          900: "#0c4169",
        },
        // Neutral surface scale
        surface: {
          0:   "#ffffff",
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        // Semantic weather / sky
        sky: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
      },
      borderRadius: {
        card: "0.625rem",
      },
      boxShadow: {
        card:  "0 0 0 1px rgb(15 23 42 / 0.08), 0 1px 3px rgb(15 23 42 / 0.06)",
        "card-hover": "0 0 0 1px rgb(15 23 42 / 0.14), 0 2px 6px rgb(15 23 42 / 0.08)",
        fab:   "0 2px 8px rgb(15 23 42 / 0.18)",
      },
      typography: () => ({
        DEFAULT: {
          css: {
            maxWidth: "none",
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
