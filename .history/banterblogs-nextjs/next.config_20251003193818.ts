import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  generateBuildId: () => {
    // Fixed custom build ID generation - synchronous function
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
