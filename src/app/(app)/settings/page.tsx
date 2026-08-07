import { SettingsHome } from '@/components/settings/settings-home';
import { loadSettingsHubStatus } from '@/lib/settings/load-hub-status';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const status = await loadSettingsHubStatus();
  return <SettingsHome status={status} />;
}
