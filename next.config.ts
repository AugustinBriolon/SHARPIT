import type { NextConfig } from 'next';

function loadAllowedDevOrigins(): string[] {
  const hosts = new Set<string>(['localhost']);
  const lanHost = process.env.DEV_LAN_HOST?.trim();
  if (lanHost) hosts.add(lanHost);
  return [...hosts];
}

const nextConfig: NextConfig = {
  // Instant UX, framework side: every route gets a prerendered shell that is
  // served immediately while dynamic content streams in, and <Link> prefetches
  // one reusable shell per route instead of one payload per link.
  // Supersedes experimental.staleTimes, which is gone.
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Keeps a navigation, prefetch or Server Action pending instead of throwing
    // when the network drops, and retries it on reconnect. Also the signal
    // behind useOnlineStatus — it detects real request failures, where
    // navigator.onLine only knows whether an interface is up (ADR-008).
    useOffline: true,
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', 'motion'],
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
