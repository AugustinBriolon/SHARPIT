import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const LOCALES = ['fr', 'en'] as const;
const DEFAULT_LOCALE = 'fr';

export type Locale = (typeof LOCALES)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  let locale: string = DEFAULT_LOCALE;

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && LOCALES.includes(cookieLocale as Locale)) {
    locale = cookieLocale;
  } else {
    const acceptLanguage = headerStore.get('accept-language') ?? '';
    const preferred = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
    if (preferred && LOCALES.includes(preferred as Locale)) {
      locale = preferred;
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
