'use client';

import { GarminContent } from '@/components/settings/integrations/modal-content-garmin';
import { GoogleContent } from '@/components/settings/integrations/modal-content-google';
import { MfpContent } from '@/components/settings/integrations/modal-content-mfp';
import { RenphoContent } from '@/components/settings/integrations/modal-content-renpho';
import { StravaContent } from '@/components/settings/integrations/modal-content-strava';
import { WithingsContent } from '@/components/settings/integrations/modal-content-withings';
import type { IntegrationDefinition } from '@/components/settings/integrations/types';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';

export function IntegrationModalContent({
  integration,
  onUpdated,
  onSyncStart,
}: {
  integration: IntegrationDefinition;
  onUpdated?: () => void;
  /** Dismiss the modal as soon as a sync / full import is launched. */
  onSyncStart?: () => void;
}) {
  switch (integration.id) {
    case 'strava':
      return (
        <StravaContent integration={integration} onSyncStart={onSyncStart} onUpdated={onUpdated} />
      );
    case 'garmin':
      return (
        <GarminContent integration={integration} onSyncStart={onSyncStart} onUpdated={onUpdated} />
      );
    case 'withings':
      return (
        <WithingsContent
          integration={integration}
          onSyncStart={onSyncStart}
          onUpdated={onUpdated}
        />
      );
    case 'renpho':
      return (
        <RenphoContent integration={integration} onSyncStart={onSyncStart} onUpdated={onUpdated} />
      );
    case 'google':
      return (
        <GoogleContent integration={integration} onSyncStart={onSyncStart} onUpdated={onUpdated} />
      );
    case 'myfitnesspal':
      return (
        <MfpContent integration={integration} onSyncStart={onSyncStart} onUpdated={onUpdated} />
      );
    default:
      return null;
  }
}

export function integrationModalTitle(id: IntegrationId): string {
  const titles: Record<IntegrationId, string> = {
    strava: 'Strava',
    garmin: 'Garmin Connect',
    withings: 'Withings',
    renpho: 'Renpho Health',
    google: 'Google Calendar',
    myfitnesspal: 'MyFitnessPal',
  };
  return titles[id];
}
