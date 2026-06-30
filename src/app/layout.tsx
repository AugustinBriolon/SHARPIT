import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';
import type { Metadata } from 'next';
import { IBM_Plex_Sans, Syne } from 'next/font/google';
import { clerkAppearance } from '@/lib/clerk-appearance';
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
  themeColor: '#fafbf9',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl="/sign-in"
      appearance={clerkAppearance}
      localization={frFR}
      signInFallbackRedirectUrl="/"
    >
      <html
        className={`${syne.variable} ${ibmPlexSans.variable} h-full antialiased`}
        lang="fr"
        suppressHydrationWarning
      >
        <body className="bg-background text-foreground min-h-full font-sans">
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
