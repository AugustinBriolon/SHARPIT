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
  async headers() {
    // Report-Only for now: Clerk's auth flow and the MapLibre/CartoDB map
    // tiles (src/components/ui/map/map.tsx) depend on external domains this
    // config can't fully verify against a live browser session. Ship this to
    // staging, check the browser console for csp-report violations, tighten
    // any missing directive, then flip to `Content-Security-Policy` once
    // clean — flipping blind risks breaking sign-in for every user.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com",
      "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), midi=(), magnetometer=(), gyroscope=()',
          },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
