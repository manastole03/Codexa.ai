import type { Config } from "tailwindcss";

const preset = {
  content: [],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07080d",
          900: "#10121a",
          800: "#1a1d29",
          700: "#282d3b"
        },
        signal: {
          cyan: "#19d3da",
          lime: "#a6e22e",
          rose: "#ff5577",
          amber: "#ffb84d"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(255 255 255 / 0.08), 0 24px 90px rgb(25 211 218 / 0.18)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      }
    }
  }
} satisfies Config;

export default preset;
