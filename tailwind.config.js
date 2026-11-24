/** Tailwind v3, utilities only. Preflight is off on purpose: the
 * existing token CSS in globals.css is the source of truth, and a
 * reset would regress pages that were built without it. New screens
 * use these utilities plus the tokens; old screens keep working
 * exactly as they are.
 *
 * Futuristic redesign: the new utilities below (glow shadows, glass
 * blur, aurora/deep-space colours, gradient text) are the only
 * additions — every old utility keeps its old meaning. */
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
        /* Futuristic palette: the same blue, plus its violet
         * gradient partner and the deep-space dark surfaces. */
        violet: "#7c3aed",
        electric: "#60a5fa",
        deep: "#070b16",
        deep2: "#0d1526",
      },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
      boxShadow: {
        /* Soft blue glow for primary actions and active states. */
        glow: "0 0 24px rgba(37, 99, 235, 0.35)",
        "glow-lg": "0 0 40px rgba(37, 99, 235, 0.45)",
        glass: "0 8px 32px rgba(2, 6, 23, 0.12)",
      },
      backdropBlur: { xs: "2px" },
      backgroundImage: {
        /* Blue -> violet aurora, for hero moments and big numbers only. */
        aurora: "linear-gradient(135deg, #2563eb, #7c3aed)",
      },
    },
  },
};
