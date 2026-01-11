import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@prismax/core", "@prismax/ai-sdk", "@prismax/database"],
};

export default nextConfig;
