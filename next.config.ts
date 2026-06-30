import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dgalywyr863hv.cloudfront.net",
        pathname: "/pictures/**",
      },
    ],
  },
};

export default nextConfig;
