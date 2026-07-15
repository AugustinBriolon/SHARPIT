import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Syne } from 'next/font/google';
import { AppClerkProvider } from '@/providers/clerk-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { SwRegister } from '@/components/pwa/sw-register';
import { UpdateAvailableBanner } from '@/components/pwa/update-available-banner';
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
    apple: [{ url: '/apple-icon', type: 'image/png' }],
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
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
          <link crossOrigin="anonymous" href="https://basemaps.cartocdn.com" rel="preconnect" />
          <link href="https://basemaps.cartocdn.com" rel="dns-prefetch" />
        </head>
        <body className="bg-background text-foreground min-h-full font-sans">
          <UpdateAvailableBanner />
          <ThemeProvider serverPreference={serverPreference}>
            <QueryProvider>
              {children}
              <SnapshotOfflineSync />
            </QueryProvider>
          </ThemeProvider>
          <Toaster />
          <SwRegister />
        </body>
      </html>
    </AppClerkProvider>
  );
}
