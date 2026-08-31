import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse uses native canvas bindings — must be required at runtime, not bundled
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
