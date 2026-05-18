import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'salma-backend-4imp.onrender.com',
        pathname: '/uploads/**',
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
