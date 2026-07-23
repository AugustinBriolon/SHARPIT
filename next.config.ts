import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout.trim() || randomUUID();

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  // Manual registration via SwRegister — avoid double-register with sw-entry.
  register: false,
  // Never hard-reload on `online` — that wipes the React Query cache and forces
  // cold micro-skeletons on every flaky mobile/PWA reconnect (Instant UX + ADR-008).
  reloadOnOnline: false,
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
  globPublicPatterns: ['icons/*.{png,svg}', 'favicon.svg', 'favicon-dark.svg', 'favicon.ico'],
});

function loadAllowedDevOrigins(): string[] {
  const hosts = new Set<string>(['localhost']);
  const lanHost = process.env.DEV_LAN_HOST?.trim();
  if (lanHost) hosts.add(lanHost);
  return [...hosts];
}

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
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

export default withSerwist(nextConfig);
