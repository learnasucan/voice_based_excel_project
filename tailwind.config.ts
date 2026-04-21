import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f9ff",
          100: "#dceeff",
          500: "#1379d6",
          600: "#0e63b1",
          700: "#0a4d8c"
        }
      }
    }
  },
  plugins: []
};

export default config;
