import type { Config } from "tailwindcss";

const config = {
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#131B2E",
          700: "#3A4560",
          500: "#6B7590",
        },
        paper: "#FBF8F1",
        surface: "#FFFFFF",
        gold: {
          DEFAULT: "#EAB308",
          100: "#FEF3C7",
        },
        mint: {
          DEFAULT: "#0FA46F",
          100: "#D9F5E7",
        },
        violet: {
          DEFAULT: "#7C5CFC",
          100: "#EDE9FE",
        },
        coral: "#F2603D",
        line: "#E7E1D2",
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        meta: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      borderRadius: {
        card: "20px",
        control: "12px",
      },
    },
  },
} satisfies Config;

export default config;
