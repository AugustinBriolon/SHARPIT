import type { MetadataRoute } from 'next';
import { THEME_LIGHT_COLOR } from '@/lib/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SHARPIT',
    short_name: 'SHARPIT',
    description: 'Intelligence sportive — entraînement, récupération, décision.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // No orientation lock: iPad is a real, supported surface (portrait and landscape).
    theme_color: THEME_LIGHT_COLOR,
    background_color: THEME_LIGHT_COLOR,
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
