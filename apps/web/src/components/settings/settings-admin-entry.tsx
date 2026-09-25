import { UserCog } from 'lucide-react';
import { ShellHubGroup, ShellHubRow } from '@/components/shell/shell-hub-link';
import { isCurrentUserAdmin } from '@/lib/auth/admin';

/** Invisible for everyone except the operator — same ADMIN_EMAILS check as /admin itself. */
export async function SettingsAdminEntry() {
  if (!(await isCurrentUserAdmin())) {
    return null;
  }

  return (
    <ShellHubGroup id="admin" title="Administration">
      <ShellHubRow href="/admin" icon={UserCog} title="Panneau admin" />
    </ShellHubGroup>
  );
}
