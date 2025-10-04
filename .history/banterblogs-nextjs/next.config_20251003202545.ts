import type { NextConfig } from "next";
import path from "path";
import crypto from "crypto";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  generateBuildId: () => {
    return crypto.randomBytes(16).toString('hex');
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
