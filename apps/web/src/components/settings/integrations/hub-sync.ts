import {
  runGarminSync,
  runGoogleSync,
  runMfpSync,
  runRenphoSync,
  runStravaSync,
  runWithingsSync,
  type IntegrationId,
} from '@/lib/integrations/shared/client-sync';
import type { IntegrationDefinition } from '@/components/settings/integrations/types';

export type RowSyncState = 'running' | 'done' | 'error';

export async function syncIntegration(id: IntegrationId): Promise<string> {
  switch (id) {
    case 'strava': {
      const d = await runStravaSync();
      return `${d.imported} activité(s) importée(s)`;
    }
    case 'garmin': {
      const d = await runGarminSync();
      return `${d.updated} jour(s) santé · ${d.activities.imported} séance(s)`;
    }
    case 'withings': {
      const d = await runWithingsSync();
      return `${d.imported} mesure(s) · ${d.updated} mise(s) à jour`;
    }
    case 'renpho': {
      const d = await runRenphoSync();
      return `${d.imported} mesure(s) · ${d.updated} mise(s) à jour`;
    }
    case 'google': {
      const d = await runGoogleSync();
      return `${d.pushed} événement(s) · ${d.updated} mis à jour`;
    }
    case 'myfitnesspal': {
      const d = await runMfpSync();
      return `${d.synced} jour(s) synchronisé(s)`;
    }
  }
}

export async function syncAllConnectedIntegrations(
  connected: IntegrationDefinition[],
  setRowSync: React.Dispatch<React.SetStateAction<Partial<Record<IntegrationId, RowSyncState>>>>,
): Promise<{ results: string[]; errors: string[] }> {
  const results: string[] = [];
  const errors: string[] = [];

  for (const integration of connected) {
    setRowSync((prev) => ({ ...prev, [integration.id]: 'running' }));
    try {
      const summary = await syncIntegration(integration.id);
      results.push(`${integration.name} : ${summary}`);
      setRowSync((prev) => ({ ...prev, [integration.id]: 'done' }));
    } catch (err) {
      errors.push(
        `${integration.name} : ${err instanceof Error ? err.message : 'erreur inconnue'}`,
      );
      setRowSync((prev) => ({ ...prev, [integration.id]: 'error' }));
    }
  }

  return { results, errors };
}
