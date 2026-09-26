import type { IntegrationsPayload } from '@/components/settings/integrations/types';
import {
  buildGarminPayloadSection,
  buildGooglePayloadSection,
  buildMfpPayloadSection,
  buildRenphoPayloadSection,
  buildStravaPayloadSection,
  buildWithingsPayloadSection,
} from '@/components/settings/integrations/hub-payload-helpers';
import type { IntegrationsHubPayload } from '@sharpit/app/lib/web/payloads';

export type IntegrationsSearchParams = {
  strava?: string;
  google?: string;
  googleDetail?: string;
  withings?: string;
  withingsDetail?: string;
  garmin?: string;
};

type IntegrationStatusMessages = {
  strava: Record<string, string>;
  google: Record<string, string>;
  withings: Record<string, string>;
  garmin: Record<string, string>;
};

function buildOAuthIntegrationSections(
  hub: IntegrationsHubPayload,
  params: IntegrationsSearchParams,
  statusMessages: IntegrationStatusMessages,
) {
  const { strava, google, googleDetail, withings, withingsDetail, garmin } = params;

  return {
    strava: buildStravaPayloadSection({
      ...hub.strava,
      status: strava,
      statusMessages: statusMessages.strava,
    }),
    garmin: buildGarminPayloadSection({
      ...hub.garmin,
      status: garmin,
      statusMessages: statusMessages.garmin,
    }),
    withings: buildWithingsPayloadSection({
      ...hub.withings,
      status: withings,
      detail: withingsDetail,
      statusMessages: statusMessages.withings,
    }),
    google: buildGooglePayloadSection({
      ...hub.google,
      status: google,
      detail: googleDetail,
      statusMessages: statusMessages.google,
    }),
  };
}

function buildCredentialIntegrationSections(hub: IntegrationsHubPayload) {
  return {
    renpho: buildRenphoPayloadSection(hub.renpho.account, hub.renpho.needsReconnect),
    myfitnesspal: buildMfpPayloadSection(
      hub.myfitnesspal.account,
      hub.myfitnesspal.configured,
      hub.myfitnesspal.needsReconnect,
    ),
  };
}

/** The hub's payload from `api.`'s accounts (no token ever leaves `api.`) and the URL outcome. */
export function assembleIntegrationsPayload(
  hub: IntegrationsHubPayload,
  params: IntegrationsSearchParams,
  statusMessages: IntegrationStatusMessages,
): IntegrationsPayload {
  return {
    ...buildOAuthIntegrationSections(hub, params, statusMessages),
    ...buildCredentialIntegrationSections(hub),
  };
}
