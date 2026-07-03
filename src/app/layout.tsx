import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Syne } from 'next/font/google';
import { AppClerkProvider } from '@/providers/clerk-provider';
import { SwRegister } from '@/components/pwa/sw-register';
import { Toaster } from '@/components/ui/toast';
import { QueryProvider } from '@/providers/query-provider';
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
  themeColor: '#f8faf8',
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
      <html
        className={`${syne.variable} ${ibmPlexSans.variable} h-full antialiased`}
        lang="fr"
        suppressHydrationWarning
      >
        <body className="bg-background text-foreground min-h-full font-sans">
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
          <SwRegister />
        </body>
      </html>
    </AppClerkProvider>
  );
}
