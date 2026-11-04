import type { NextConfig } from "next";

/** Headers every response carries. They cost nothing and close off
 * whole classes of browser attacks: MIME sniffing, clickjacking,
 * referrer leakage, and access to device hardware the app never
 * uses. HSTS only matters over HTTPS, which Vercel provides. */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ headers: securityHeaders, source: "/:path*" }];
  },
};

export default nextConfig;
