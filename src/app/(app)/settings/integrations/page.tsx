import { StickyHeader } from '@/components/layout/sticky-header';
import { IntegrationsHub } from '@/components/settings/integrations-hub';
import { getGarminAccount } from '@/lib/integrations/garmin-sync';
import { isGoogleConfigured } from '@/lib/integrations/google';
import { getGoogleAccount, isGoogleConnected } from '@/lib/integrations/google-sync';
import { getRenphoAccount } from '@/lib/integrations/renpho-sync';
import { isStravaConfigured } from '@/lib/integrations/strava';
import { getStravaAccount } from '@/lib/integrations/strava-sync';
import { isWithingsConfigured } from '@/lib/integrations/withings';
import { getWithingsAccount } from '@/lib/integrations/withings-sync';

export const dynamic = 'force-dynamic';

const statusMessages: Record<string, string> = {
  connected: 'Compte Strava connecté.',
  denied: 'Connexion refusée sur Strava.',
  invalid_state: 'Session expirée, réessaie la connexion.',
  no_athlete: "Strava n'a pas renvoyé d'athlète.",
  error: 'Une erreur est survenue lors de la connexion.',
};

const googleStatusMessages: Record<string, string> = {
  connected: 'Google Calendar connecté.',
  denied: 'Connexion refusée sur Google.',
  invalid_state: 'Session expirée, réessaie la connexion.',
  no_refresh:
    "Google n'a pas renvoyé de jeton de rafraîchissement. Réessaie en autorisant l'accès hors-ligne.",
  error: 'Une erreur est survenue lors de la connexion à Google.',
};

const withingsStatusMessages: Record<string, string> = {
  connected: 'Compte Withings connecté.',
  denied: 'Connexion refusée sur Withings.',
  invalid_state: 'Session expirée, réessaie la connexion.',
  error: 'Une erreur est survenue lors de la connexion à Withings.',
};

type PageProps = {
  searchParams: Promise<{
    strava?: string;
    google?: string;
    googleDetail?: string;
    withings?: string;
    withingsDetail?: string;
  }>;
};

export default async function SettingsIntegrationsPage({ searchParams }: PageProps) {
  const [params, accounts] = await Promise.all([
    searchParams,
    Promise.all([
      getStravaAccount(),
      Promise.resolve(isStravaConfigured()),
      getGarminAccount(),
      getRenphoAccount(),
      getWithingsAccount(),
      getGoogleAccount().catch(() => null),
      Promise.resolve(isGoogleConfigured()),
      Promise.resolve(isWithingsConfigured()),
    ]),
  ]);

  const { strava, google, googleDetail, withings, withingsDetail } = params;
  const [
    stravaAccount,
    configured,
    garminAccount,
    renphoAccount,
    withingsAccount,
    googleAccount,
    googleConfigured,
    withingsConfigured,
  ] = accounts;

  const integrationsPayload = {
    strava: {
      configured,
      account: stravaAccount
        ? {
            firstName: stravaAccount.firstName,
            lastName: stravaAccount.lastName,
            avatarUrl: stravaAccount.avatarUrl,
            lastSyncAt: stravaAccount.lastSyncAt?.toISOString() ?? null,
          }
        : null,
      statusMessage: strava ? statusMessages[strava] : undefined,
    },
    garmin: {
      account: garminAccount
        ? {
            displayName: garminAccount.displayName,
            fullName: garminAccount.fullName,
            lastSyncAt: garminAccount.lastSyncAt?.toISOString() ?? null,
          }
        : null,
    },
    withings: {
      configured: withingsConfigured,
      account: withingsAccount
        ? {
            displayName: withingsAccount.displayName,
            lastSyncAt: withingsAccount.lastSyncAt?.toISOString() ?? null,
          }
        : null,
      statusMessage: withings
        ? [
            withingsStatusMessages[withings],
            withings === 'error' && withingsDetail ? `Détail : ${withingsDetail}` : null,
          ]
            .filter(Boolean)
            .join(' ')
        : undefined,
    },
    renpho: {
      account: renphoAccount
        ? {
            email: renphoAccount.email,
            displayName: renphoAccount.displayName,
            lastSyncAt: renphoAccount.lastSyncAt?.toISOString() ?? null,
          }
        : null,
    },
    google: {
      configured: googleConfigured,
      account:
        isGoogleConnected(googleAccount) && googleAccount
          ? {
              email: googleAccount.email,
              targetCalendarId: googleAccount.targetCalendarId,
              targetCalendarName: googleAccount.targetCalendarName,
              lastSyncAt: googleAccount.lastSyncAt?.toISOString() ?? null,
            }
          : null,
      statusMessage: google
        ? [
            googleStatusMessages[google],
            google === 'error' && googleDetail ? `Détail : ${googleDetail}` : null,
          ]
            .filter(Boolean)
            .join(' ')
        : undefined,
    },
  };

  return (
    <div className="space-y-4">
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Réglages
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Applications connectées</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Connecte tes sources, lance les synchronisations et contrôle la fraîcheur des données.
        </p>
      </StickyHeader>

      <IntegrationsHub payload={integrationsPayload} />
    </div>
  );
}
