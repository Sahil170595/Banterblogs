import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    staticGenerationRetryDelay: 5000,
  },
  outputFileTracing: false,
};

export default nextConfig;
