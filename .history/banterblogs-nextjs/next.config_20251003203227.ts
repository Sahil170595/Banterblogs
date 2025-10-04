import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // Fix crypto compatibility for Node v22
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve('crypto-browserify'),
    };
    return config;
  },
};

console.log('Next.js config loaded:', nextConfig);

export default nextConfig;
