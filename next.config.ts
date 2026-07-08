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
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
  globPublicPatterns: ['icons/*.{png,svg}', 'favicon.svg'],
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
