import { UserCog } from 'lucide-react';
import { SettingsEntryRow } from '@/components/settings/settings-home';
import { isCurrentUserAdmin } from '@/lib/auth/admin';

/** Invisible for everyone except the operator — same ADMIN_EMAILS check as /admin itself. */
export async function SettingsAdminEntry() {
  if (!(await isCurrentUserAdmin())) {
    return null;
  }

  return (
    <section aria-labelledby="settings-group-admin">
      <div className="mb-3">
        <h2 className="text-section-title" id="settings-group-admin">
          Administration
        </h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Visible uniquement par toi.
        </p>
      </div>
      <ul className="space-y-2">
        <SettingsEntryRow
          entry={{
            href: '/admin',
            title: 'Panneau admin',
            description: 'Comptes et paliers d’accès (Gratuit / Pro).',
            icon: UserCog,
          }}
        />
      </ul>
    </section>
  );
}
