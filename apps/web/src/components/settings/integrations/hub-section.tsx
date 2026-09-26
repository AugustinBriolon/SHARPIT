import { IntegrationsHub } from '@/components/settings/integrations/hub';
import {
  assembleIntegrationsPayload,
  type IntegrationsSearchParams,
} from '@/components/settings/integrations/hub-section-load';
import type { IntegrationsHubPayload } from '@sharpit/server/lib/web/integrations-hub';
import { cachedServerApiJson } from '@/server/api-client';

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

const garminStatusMessages: Record<string, string> = {
  connected: 'Compte Garmin connecté.',
  denied: 'Connexion refusée sur Garmin.',
  invalid_state: 'Session expirée, réessaie la connexion Garmin.',
  error: 'Une erreur est survenue lors de la connexion à Garmin.',
};

export async function IntegrationsHubSection({
  searchParams,
}: {
  searchParams: IntegrationsSearchParams;
}) {
  const hub = await cachedServerApiJson<IntegrationsHubPayload>('/api/web/integrations-hub', true);
  if (!hub) {
    throw new Error('api. has no integrations hub for this session');
  }
  const payload = assembleIntegrationsPayload(hub, searchParams, {
    strava: statusMessages,
    google: googleStatusMessages,
    withings: withingsStatusMessages,
    garmin: garminStatusMessages,
  });
  return <IntegrationsHub initialPrefs={hub.prefs} payload={payload} />;
}
