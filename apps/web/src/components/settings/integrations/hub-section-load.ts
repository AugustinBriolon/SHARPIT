import type { IntegrationsPayload } from '@/components/settings/integrations/types';
import {
  buildGarminPayloadSection,
  buildGooglePayloadSection,
  buildMfpPayloadSection,
  buildRenphoPayloadSection,
  buildStravaPayloadSection,
  buildWithingsPayloadSection,
} from '@/components/settings/integrations/hub-payload-helpers';
import { getGarminAccount } from '@/lib/integrations/garmin/garmin-sync';
import { isGoogleConfigured } from '@/lib/integrations/google/google';
import { getGoogleAccount, isGoogleConnected } from '@/lib/integrations/google/google-sync';
import { getMfpAccount } from '@/lib/integrations/myfitnesspal/myfitnesspal-sync';
import { isMfpConfigured } from '@/lib/integrations/myfitnesspal/myfitnesspal';
import { getRenphoAccount } from '@/lib/integrations/renpho/renpho-sync';
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

export type IntegrationsSearchParams = {
  strava?: string;
  google?: string;
  googleDetail?: string;
  withings?: string;
  withingsDetail?: string;
  garmin?: string;
};

type IntegrationAccounts = Awaited<ReturnType<typeof loadIntegrationAccounts>>;

export async function loadIntegrationAccounts(athleteId: string) {
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

  return {
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
  };
}

type IntegrationStatusMessages = {
  strava: Record<string, string>;
  google: Record<string, string>;
  withings: Record<string, string>;
  garmin: Record<string, string>;
};

function buildOAuthIntegrationSections(
  accounts: IntegrationAccounts,
  params: IntegrationsSearchParams,
  statusMessages: IntegrationStatusMessages,
) {
  const { strava, google, googleDetail, withings, withingsDetail, garmin } = params;

  return {
    strava: buildStravaPayloadSection({
      account: accounts.stravaAccount,
      configured: accounts.configured,
      needsReconnect:
        Boolean(accounts.stravaAccount) && !isOAuthAccountConnected(accounts.stravaAccount),
      status: strava,
      statusMessages: statusMessages.strava,
    }),
    garmin: buildGarminPayloadSection({
      account: accounts.garminAccount,
      needsReconnect:
        Boolean(accounts.garminAccount) && !isGarminAccountConnected(accounts.garminAccount),
      status: garmin,
      statusMessages: statusMessages.garmin,
    }),
    withings: buildWithingsPayloadSection({
      account: accounts.withingsAccount,
      configured: accounts.withingsConfigured,
      needsReconnect:
        Boolean(accounts.withingsAccount) && !isOAuthAccountConnected(accounts.withingsAccount),
      status: withings,
      detail: withingsDetail,
      statusMessages: statusMessages.withings,
    }),
    google: buildGooglePayloadSection({
      account: accounts.googleAccount,
      configured: accounts.googleConfigured,
      needsReconnect: Boolean(accounts.googleAccount) && !isGoogleConnected(accounts.googleAccount),
      status: google,
      detail: googleDetail,
      statusMessages: statusMessages.google,
    }),
  };
}

function buildCredentialIntegrationSections(accounts: IntegrationAccounts) {
  return {
    renpho: buildRenphoPayloadSection(
      accounts.renphoAccount,
      Boolean(accounts.renphoAccount) && !isRenphoAccountConnected(accounts.renphoAccount),
    ),
    myfitnesspal: buildMfpPayloadSection(
      accounts.mfpAccount,
      accounts.mfpConfigured,
      Boolean(accounts.mfpAccount) && !isMfpAccountConnected(accounts.mfpAccount),
    ),
  };
}

export function assembleIntegrationsPayload(
  accounts: IntegrationAccounts,
  params: IntegrationsSearchParams,
  statusMessages: IntegrationStatusMessages,
): IntegrationsPayload {
  return {
    ...buildOAuthIntegrationSections(accounts, params, statusMessages),
    ...buildCredentialIntegrationSections(accounts),
  };
}
