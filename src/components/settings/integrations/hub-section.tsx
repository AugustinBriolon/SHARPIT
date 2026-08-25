import { IntegrationsHub } from '@/components/settings/integrations/hub';
import type { IntegrationsPayload } from '@/components/settings/integrations/types';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { getGarminAccount } from '@/lib/integrations/garmin/garmin-sync';
import { isGoogleConfigured } from '@/lib/integrations/google/google';
import { getGoogleAccount, isGoogleConnected } from '@/lib/integrations/google/google-sync';
import { getMfpAccount } from '@/lib/integrations/myfitnesspal/myfitnesspal-sync';
import { isMfpConfigured } from '@/lib/integrations/myfitnesspal/myfitnesspal';

import { getRenphoAccount } from '@/lib/integrations/renpho/renpho-sync';
import { loadResolvedSourcePrefs } from '@/lib/integrations/source-prefs-store';
import { isStravaConfigured } from '@/lib/integrations/strava/strava';
import { getStravaAccount } from '@/lib/integrations/strava/strava-sync';
import { isWithingsConfigured } from '@/lib/integrations/withings/withings';
import { getWithingsAccount } from '@/lib/integrations/withings/withings-sync';
import {
  isGarminAccountConnected,
  isMfpAccountConnected,
  isOAuthAccountConnected,
  isRenphoAccountConnected,
} from '@/lib/integrations/shared/connection-status';

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

type IntegrationsSearchParams = {
  strava?: string;
  google?: string;
  googleDetail?: string;
  withings?: string;
  withingsDetail?: string;
};

async function buildIntegrationsPayload(
  params: IntegrationsSearchParams,
): Promise<IntegrationsPayload> {
  const athleteId = await getCurrentAthleteId();
  const [
    stravaAccount,
    configured,
    garminAccount,
    renphoAccount,
    withingsAccount,
    googleAccount,
    mfpAccount,
    googleConfigured,
    withingsConfigured,
    mfpConfigured,
  ] = await Promise.all([
    getStravaAccount(athleteId),
    Promise.resolve(isStravaConfigured()),
    getGarminAccount(athleteId),
    getRenphoAccount(athleteId),
    getWithingsAccount(athleteId),
    getGoogleAccount(athleteId).catch(() => null),
    getMfpAccount(athleteId).catch(() => null),
    Promise.resolve(isGoogleConfigured()),
    Promise.resolve(isWithingsConfigured()),
    Promise.resolve(isMfpConfigured()),
  ]);

  const { strava, google, googleDetail, withings, withingsDetail } = params;

  return {
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
      needsReconnect: Boolean(stravaAccount) && !isOAuthAccountConnected(stravaAccount),
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
      needsReconnect: Boolean(garminAccount) && !isGarminAccountConnected(garminAccount),
    },
    withings: {
      configured: withingsConfigured,
      account: withingsAccount
        ? {
            displayName: withingsAccount.displayName,
            lastSyncAt: withingsAccount.lastSyncAt?.toISOString() ?? null,
          }
        : null,
      needsReconnect: Boolean(withingsAccount) && !isOAuthAccountConnected(withingsAccount),
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
      needsReconnect: Boolean(renphoAccount) && !isRenphoAccountConnected(renphoAccount),
    },
    google: {
      configured: googleConfigured,
      account: googleAccount
        ? {
            email: googleAccount.email,
            targetCalendarId: googleAccount.targetCalendarId,
            targetCalendarName: googleAccount.targetCalendarName,
            lastSyncAt: googleAccount.lastSyncAt?.toISOString() ?? null,
          }
        : null,
      needsReconnect: Boolean(googleAccount) && !isGoogleConnected(googleAccount),
      statusMessage: google
        ? [
            googleStatusMessages[google],
            google === 'error' && googleDetail ? `Détail : ${googleDetail}` : null,
          ]
            .filter(Boolean)
            .join(' ')
        : undefined,
    },
    myfitnesspal: {
      configured: mfpConfigured,
      account: mfpAccount
        ? {
            displayName: mfpAccount.displayName,
            lastSyncAt: mfpAccount.lastSyncAt?.toISOString() ?? null,
          }
        : null,
      needsReconnect: Boolean(mfpAccount) && !isMfpAccountConnected(mfpAccount),
    },
  };
}

export async function IntegrationsHubSection({
  searchParams,
}: {
  searchParams: IntegrationsSearchParams;
}) {
  const athleteId = await getCurrentAthleteId();
  const [payload, prefs] = await Promise.all([
    buildIntegrationsPayload(searchParams),
    loadResolvedSourcePrefs(athleteId),
  ]);
  return <IntegrationsHub initialPrefs={prefs} payload={payload} />;
}
