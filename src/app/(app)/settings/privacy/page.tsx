import { permanentRedirect } from 'next/navigation';
import { MOI_ACCOUNT_PATH, MOI_PRIVACY_HASH } from '@/lib/moi/paths';

/** Confidentialité lives on Profil — keep the old URL as a deep link. */
export default async function SettingsPrivacyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const dest = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      dest.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      dest.set(key, value[0]);
    }
  }
  const query = dest.toString();
  permanentRedirect(`${MOI_ACCOUNT_PATH}${query ? `?${query}` : ''}${MOI_PRIVACY_HASH}`);
}
