import type { NextConfig } from 'next';

// Accès dev depuis le téléphone sur le LAN (ex. http://192.168.1.187:3000).
// Définir DEV_LAN_HOST dans .env avec l’IP locale du Mac (ifconfig en0).
const devLanHost = process.env.DEV_LAN_HOST?.trim();

const nextConfig: NextConfig = {
  ...(devLanHost ? { allowedDevOrigins: [devLanHost] } : {}),
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
