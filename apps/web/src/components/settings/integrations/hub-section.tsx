import { IntegrationsHub } from '@/components/settings/integrations/hub';
import {
  assembleIntegrationsPayload,
  loadIntegrationAccounts,
  type IntegrationsSearchParams,
} from '@/components/settings/integrations/hub-section-load';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { loadResolvedSourcePrefs } from '@/lib/integrations/source-prefs-store';

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

async function buildIntegrationsPayload(params: IntegrationsSearchParams) {
  const athleteId = await getCurrentAthleteId();
  const accounts = await loadIntegrationAccounts(athleteId);
  return assembleIntegrationsPayload(accounts, params, {
    strava: statusMessages,
    google: googleStatusMessages,
    withings: withingsStatusMessages,
    garmin: garminStatusMessages,
  });
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
