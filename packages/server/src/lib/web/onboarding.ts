import { normalizeAthleteEquipment } from '@sharpit/server/lib/equipment/parse';
import {
  loadConnectedIntegrationIds,
  loadResolvedSourcePrefs,
} from '@sharpit/server/lib/integrations/source-prefs-store';
import { getAthleteConsentRow } from '@sharpit/server/lib/privacy/consent-store';
import { getAthleteProfile } from '@sharpit/server/lib/queries';

/** The onboarding wizard's starting state, read on `api.` (ADR-048 phase 3f). */
export async function loadOnboarding(athleteId: string) {
  const [connected, prefs, profile, consents] = await Promise.all([
    loadConnectedIntegrationIds(athleteId),
    loadResolvedSourcePrefs(athleteId),
    getAthleteProfile(athleteId).catch(() => null),
    getAthleteConsentRow(athleteId),
  ]);
  return {
    initialEquipment: normalizeAthleteEquipment(profile?.equipment ?? null),
    initiallyConnected: connected,
    initialPrefs: prefs,
    unofficialAcknowledged: Boolean(consents?.unofficialProvidersAckAt),
  };
}

export type OnboardingPayload = Awaited<ReturnType<typeof loadOnboarding>>;
