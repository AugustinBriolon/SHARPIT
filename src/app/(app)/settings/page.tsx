import { HubStatusValue } from '@/components/settings/hub-status-value';
import { SettingsHome, type SettingsStatusSlots } from '@/components/settings/settings-home';

const statusSlots: SettingsStatusSlots = {
  account: <HubStatusValue statusKey="account" />,
  equipment: <HubStatusValue statusKey="equipment" />,
  goals: <HubStatusValue statusKey="goals" />,
  memory: <HubStatusValue statusKey="memory" />,
  integrations: <HubStatusValue statusKey="integrations" />,
  about: <HubStatusValue statusKey="about" />,
};

export default function SettingsPage() {
  return <SettingsHome statusSlots={statusSlots} />;
}
