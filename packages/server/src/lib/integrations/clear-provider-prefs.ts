import type { IntegrationId } from '@sharpit/server/lib/integrations/shared/client-sync';
import { removeProviderEverywhere } from '@sharpit/server/lib/integrations/source-prefs';
import { persistSourcePrefsMutation } from '@sharpit/server/lib/integrations/source-prefs-store';

/** After account disconnect: drop the provider from every data-class preference. */
export async function clearProviderFromSourcePrefs(
  athleteId: string,
  provider: IntegrationId,
): Promise<void> {
  try {
    await persistSourcePrefsMutation(athleteId, (prefs) =>
      removeProviderEverywhere(prefs, provider),
    );
  } catch (err) {
    console.error('[source-prefs] clear after disconnect failed:', err);
  }
}
