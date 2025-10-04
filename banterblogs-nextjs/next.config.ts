import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

console.log('Next.js config loaded:', nextConfig);

export default nextConfig;
