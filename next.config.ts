import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Tạm thời bỏ basePath để test
  // basePath: process.env.NODE_ENV === 'production' ? '/changemoney' : '',
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/changemoney/' : '',
};

export default nextConfig;
