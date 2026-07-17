import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Syne } from 'next/font/google';
import Script from 'next/script';
import { AppClerkProvider } from '@/providers/clerk-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { SwRegister } from '@/components/pwa/sw-register';
import { UpdateAvailableToast } from '@/components/pwa/update-available-toast';
import { SnapshotOfflineSync } from '@/components/pwa/snapshot-offline-sync';
import { Toaster } from '@/components/ui/toast';
import { QueryProvider } from '@/providers/query-provider';
import { THEME_INIT_SCRIPT, THEME_DARK_COLOR, THEME_LIGHT_COLOR } from '@/lib/theme';
import { getServerResolvedTheme, getServerThemePreference } from '@/lib/theme.server';
import { cn } from '@/lib/utils';
import './globals.css';

const syne = Syne({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'SharpIt',
  description: 'Training intelligence — entraînement, analytics, récupération.',
  applicationName: 'SHARPIT',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SHARPIT',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    // apple-icon.tsx now generates 3 sizes (180/167/152) via generateImageMetadata
    // — leave `apple` unset so Next.js's own file-convention resolution wires up
    // all three <link> tags instead of pinning a single manually-declared one.
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [serverResolved, serverPreference] = await Promise.all([
    getServerResolvedTheme(),
    getServerThemePreference(),
  ]);

  return (
    <AppClerkProvider>
      <html
        lang="fr"
        style={serverResolved ? { colorScheme: serverResolved } : undefined}
        className={cn(
          syne.variable,
          ibmPlexSans.variable,
          'h-full antialiased',
          serverResolved === 'dark' && 'dark',
        )}
        suppressHydrationWarning
      >
        <head>
          <Script
            dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
            id="theme-init"
            strategy="beforeInteractive"
          />
          <link crossOrigin="anonymous" href="https://basemaps.cartocdn.com" rel="preconnect" />
          <link href="https://basemaps.cartocdn.com" rel="dns-prefetch" />
          {/* iOS splash screens — one representative device per class (docs/PWA_TESTING.md).
              Not a Next.js metadata field; Apple requires exact <link>+media pairs. */}
          <link
            href="/apple-splash/iphone-notch"
            media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
            rel="apple-touch-startup-image"
          />
          <link
            href="/apple-splash/iphone-se"
            media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
            rel="apple-touch-startup-image"
          />
          <link
            href="/apple-splash/ipad-portrait"
            media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
            rel="apple-touch-startup-image"
          />
          <link
            href="/apple-splash/ipad-landscape"
            media="(device-width: 1180px) and (device-height: 820px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
            rel="apple-touch-startup-image"
          />
        </head>
        <body className="bg-background text-foreground min-h-full font-sans">
          <ThemeProvider serverPreference={serverPreference}>
            <QueryProvider>
              {children}
              <SnapshotOfflineSync />
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
