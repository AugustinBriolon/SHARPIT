import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, JetBrains_Mono, Syne } from 'next/font/google';
import { AppClerkProvider } from '@/providers/clerk-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { SwRegister } from '@/components/pwa/sw-register';
import { UpdateAvailableToast } from '@/components/pwa/update-available-toast';
import { SnapshotOfflineSync } from '@/components/pwa/snapshot-offline-sync';
import { Toaster } from '@/components/ui/toast';
import { QueryProvider } from '@/providers/query-provider';
import { AppModalProvider } from '@/providers/app-modal-provider';
import { DeviceLocationProvider } from '@/components/today/dashboard/device-location-provider';
import { THEME_DARK_COLOR, THEME_LIGHT_COLOR } from '@/lib/theme/theme';
import { RootLayoutHead } from '@/app/root-layout-head';
import { cn } from '@/lib/utils';
import './globals.css';

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-ibm-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'SHARPIT',
  description: 'Intelligence sportive — entraînement, récupération, décision.',
  applicationName: 'SHARPIT',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SHARPIT',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/favicon-dark.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    // apple-icon.tsx generates 180/167/152 via generateImageMetadata —
    // leave `apple` unset so Next.js wires all three <link> tags.
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_LIGHT_COLOR },
    { media: '(prefers-color-scheme: dark)', color: THEME_DARK_COLOR },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppClerkProvider>
      {/* The theme is resolved entirely on the client: THEME_INIT_SCRIPT below
          sets `dark` / colorScheme / theme-color before paint, and ThemeProvider
          re-reads the stored preference on mount. Reading the theme cookie here
          instead would make the root layout runtime-dependent, which costs every
          route its prerendered shell. */}
      <html
        lang="fr"
        className={cn(
          syne.variable,
          ibmPlexSans.variable,
          jetBrainsMono.variable,
          'h-full antialiased',
        )}
        suppressHydrationWarning
      >
        <head>
          <RootLayoutHead />
        </head>
        <body className="bg-background text-foreground min-h-full font-sans">
          <ThemeProvider>
            <QueryProvider>
              <DeviceLocationProvider>
                <AppModalProvider>
                  {children}
                  {/* Keyed on the current training day, so it must stay out of the
                      prerendered shell. It renders nothing, so the boundary costs
                      no UI — there is deliberately no fallback. */}
                  <Suspense>
                    <SnapshotOfflineSync />
                  </Suspense>
                </AppModalProvider>
              </DeviceLocationProvider>
            </QueryProvider>
          </ThemeProvider>
          <Toaster />
          <UpdateAvailableToast />
          <SwRegister />
        </body>
      </html>
    </AppClerkProvider>
  );
}
