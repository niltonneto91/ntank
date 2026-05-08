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
        // Identidade NTN
        verde: {
          DEFAULT: "#ADD91C",
          50: "#F4FAE0",
          100: "#E9F5C2",
          200: "#D6EC92",
          300: "#C4E261",
          400: "#B5DC3B",
          500: "#ADD91C",
          600: "#8AAE16",
          700: "#688311",
          800: "#45580B",
          900: "#222C06",
        },
        carbono: {
          DEFAULT: "#0A0A0A",
          50: "#F5F5F5",
          100: "#E5E5E5",
          200: "#C7C7C7",
          300: "#A3A3A3",
          400: "#737373",
          500: "#525252",
          600: "#404040",
          700: "#262626",
          800: "#171717",
          900: "#0A0A0A",
        },
        creme: "#ECECE3",
      },
      fontFamily: {
        title: ["var(--font-title)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
        focus: "0 0 0 3px rgba(173, 217, 28, 0.45)",
      },
    },
  },
  plugins: [
    // Suporte a safe-area-inset para iOS PWA (notch, home indicator)
    function ({ addUtilities }: { addUtilities: (u: Record<string, Record<string, string>>) => void }) {
      addUtilities({
        ".pb-safe": { paddingBottom: "env(safe-area-inset-bottom, 0px)" },
        ".pt-safe": { paddingTop: "env(safe-area-inset-top, 0px)" },
        ".pl-safe": { paddingLeft: "env(safe-area-inset-left, 0px)" },
        ".pr-safe": { paddingRight: "env(safe-area-inset-right, 0px)" },
      });
    },
  ],
};

export default config;
