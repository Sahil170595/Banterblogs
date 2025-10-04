import type { NextConfig } from "next";
import path from "path";
import crypto from "crypto";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  generateBuildId: () => {
    return 'banterblogs-build';
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
