import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import type { Metadata } from "next";
import { IBM_Plex_Sans, Syne } from "next/font/google";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { Toaster } from "@/components/ui/toast";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const syne = Syne({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SharpIt",
  description: "Training intelligence — entraînement, analytics, récupération.",
  themeColor: "#fafbf9",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={frFR}
      appearance={clerkAppearance}
      afterSignOutUrl="/sign-in"
      signInFallbackRedirectUrl="/"
    >
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${syne.variable} ${ibmPlexSans.variable} h-full antialiased`}
    >
        <body className="min-h-full bg-background font-sans text-foreground">
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
