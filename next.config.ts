import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Force fresh start - updated for Supabase connection
  experimental: {
    // Enable experimental features
  },
};

export default nextConfig;
