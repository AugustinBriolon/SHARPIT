import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * sharpit.app, the apex (ADR-048 phase 4, ADR-051): the Apple app-site association, the native
 * Garmin handoff (`/connect/*`, immutable for iOS), the legal pages and the sign-in that redeems
 * a handoff ticket. Every other path belongs to the web app on `web.sharpit.app`.
 */
const WEB_ORIGIN = 'https://web.sharpit.app';

/** Paths the hub serves itself; everything else goes to the web, path and query kept. */
const HUB_PATHS =
  '\\.well-known|connect|privacy|terms|sign-in|_next|__clerk|favicon\\.ico|icon|apple-icon';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://clerk.sharpit.app",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.sharpit.app https://clerk.sharpit.app https://*.clerk.accounts.dev https://*.clerk.com",
  "frame-src 'self' https://clerk.sharpit.app https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://sso.garmin.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@sharpit/app', '@sharpit/core', '@sharpit/shared', '@sharpit/ui'],
  async headers() {
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
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: `/:path((?!${HUB_PATHS}).*)`,
        destination: `${WEB_ORIGIN}/:path`,
        permanent: false,
      },
      // `/:path(...)` needs a segment; the apex root is its own rule.
      { source: '/', destination: `${WEB_ORIGIN}/`, permanent: false },
    ];
  },
};

export default nextConfig;
