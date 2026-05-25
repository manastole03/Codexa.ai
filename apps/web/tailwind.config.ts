import preset from "@codexa/config/tailwind.preset";
import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config = {
  presets: [preset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {}
  },
  plugins: [typography]
} satisfies Config;

export default config;
