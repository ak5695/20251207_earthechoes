import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const withPWAConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  output: process.env.CAPACITOR_BUILD ? "export" : undefined,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "three"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    unoptimized: process.env.CAPACITOR_BUILD === "true",
  },
};

export default withPWAConfig(nextConfig);
