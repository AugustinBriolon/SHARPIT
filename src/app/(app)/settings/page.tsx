import { SettingsHome } from '@/components/settings/settings-home';

// SettingsAdminEntry/InstallCard/SettingsSignOut each conditionally render
// nothing at request time — Next 16's instant-navigation validation can't
// statically prove those islands always render, same reasoning as
// settings/goals, biology.
export const instant = false;

export default function SettingsPage() {
  return <SettingsHome />;
}
