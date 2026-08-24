import { SettingsHome } from '@/components/settings/settings-home';

// The demo check in settings/layout.tsx decides, at request time, whether
// this segment renders at all — same reasoning as settings/goals, biology.
export const instant = false;

export default function SettingsPage() {
  return <SettingsHome />;
}
