/** Tailwind v3, utilities only. Preflight is off on purpose: the
 * existing token CSS in globals.css is the source of truth, and a
 * reset would regress pages that were built without it. New screens
 * use these utilities plus the tokens; old screens keep working
 * exactly as they are. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  corePlugins: { preflight: false },
  plugins: [],
  theme: {
    extend: {
      borderRadius: { DEFAULT: "14px", sm: "10px" },
      colors: {
        ink: "#0f172a",
        line: "#e2e8f0",
        muted: "#64748b",
        navy: "#111827",
        primary: "#2563eb",
        wash: "#f8fafc",
      },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
    },
  },
};
