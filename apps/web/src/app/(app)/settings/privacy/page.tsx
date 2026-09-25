import { redirect } from 'next/navigation';
import { MOI_ACCOUNT_PATH, MOI_PRIVACY_HASH } from '@/lib/moi/paths';

/** Confidentialité lives on Profil — keep the old URL as a deep link. */
export default function SettingsPrivacyPage() {
  redirect(`${MOI_ACCOUNT_PATH}${MOI_PRIVACY_HASH}`);
}
