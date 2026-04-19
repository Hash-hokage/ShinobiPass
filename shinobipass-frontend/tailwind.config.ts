import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        primary: "var(--accent-purple)",
        teal: "var(--accent-teal)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        border: "var(--border)",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, var(--accent-purple), #947dff)',
      },
      boxShadow: {
        'glow': '0 0 40px 6px rgba(124, 92, 252, 0.06)',
        'glow-hover': '0 0 60px 8px rgba(124, 92, 252, 0.1)',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
