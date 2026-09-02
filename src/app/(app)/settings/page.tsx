import { redirect } from 'next/navigation';

/**
 * Blocking: nothing to stream — the Profile hub moved to `/moi` (Shell V1).
 * Deep links under `/settings/*` stay; only the hub root redirects.
 */
export const instant = false;

export default function SettingsPage() {
  redirect('/moi');
}
