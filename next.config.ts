import type { NextConfig } from 'next';

function loadAllowedDevOrigins(): string[] {
  const hosts = new Set<string>(['localhost']);
  const lanHost = process.env.DEV_LAN_HOST?.trim();
  if (lanHost) hosts.add(lanHost);
  return [...hosts];
}

const nextConfig: NextConfig = {
  experimental: {
    // Instant UX: keep dynamic RSC payloads briefly so in-app back/forward
    // (and Link fallbacks) reuse the warm route instead of cold-loading.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  turbopack: {},
  allowedDevOrigins: loadAllowedDevOrigins(),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dgalywyr863hv.cloudfront.net',
        pathname: '/pictures/**',
      },
    ],
  },
};

export default nextConfig;
