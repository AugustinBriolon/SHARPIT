import { IBM_Plex_Sans, JetBrains_Mono, Syne } from 'next/font/google';

/** The three brand families, as CSS variables every app puts on `<html>`. */
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

export const FONT_VARIABLES = [syne.variable, ibmPlexSans.variable, jetBrainsMono.variable];
