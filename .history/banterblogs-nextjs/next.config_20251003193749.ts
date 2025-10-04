import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  generateBuildId: async () => {
    // Fixed custom build ID generation
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
