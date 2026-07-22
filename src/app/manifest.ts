import type { MetadataRoute } from 'next';
import { THEME_LIGHT_COLOR } from '@/lib/theme/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SHARPIT',
    short_name: 'SHARPIT',
    description: 'Intelligence sportive — entraînement, récupération, décision.',
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // No orientation lock: iPad is a real, supported surface (portrait and landscape).
    // theme/background stay light: install splash + Android chrome default.
    // Runtime theme-color meta (layout viewport + THEME_INIT_SCRIPT) follows light/dark.
    theme_color: THEME_LIGHT_COLOR,
    background_color: THEME_LIGHT_COLOR,
    categories: ['health', 'fitness', 'sports'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
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
