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
  },
};

export default nextConfig;
