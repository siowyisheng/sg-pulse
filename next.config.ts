import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only loaded by local demo mode (`npm run demo`); never bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
