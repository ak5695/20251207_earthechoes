import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "three"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
