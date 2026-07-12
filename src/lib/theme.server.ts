import { cookies } from 'next/headers';
import {
  isThemePreference,
  type ResolvedTheme,
  type ThemePreference,
  THEME_STORAGE_KEY,
} from '@/lib/theme';

export async function getServerThemePreference(): Promise<ThemePreference> {
  const cookieStore = await cookies();
  const preference = cookieStore.get(THEME_STORAGE_KEY)?.value;
  return isThemePreference(preference) ? preference : 'system';
}

/** Explicit light/dark from cookie (system → null, script decides). */
export async function getServerResolvedTheme(): Promise<ResolvedTheme | null> {
  const preference = await getServerThemePreference();
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return null;
}
