import { MoiHub } from '@/components/shell/moi-hub';

// SettingsAdminEntry / InstallCard / SettingsSignOut each conditionally render
// nothing at request time — same instant:false contract as the former settings hub.
export const instant = false;

export default function MoiPage() {
  return <MoiHub />;
}
