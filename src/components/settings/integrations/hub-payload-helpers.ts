import type { IntegrationsPayload } from '@/components/settings/integrations/types';

type OAuthAccountSlice = {
  displayName?: string | null;
  lastSyncAt?: Date | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  fullName?: string | null;
  targetCalendarId?: string | null;
  targetCalendarName?: string | null;
};

function isoOrNull(date: Date | null | undefined): string | null {
  return date?.toISOString() ?? null;
}

function oauthStatusMessage(
  messages: Record<string, string>,
  status: string | undefined,
  detail?: string,
): string | undefined {
  if (!status) {
    return undefined;
  }
  const parts = [messages[status], status === 'error' && detail ? `Détail : ${detail}` : null];
  return parts.filter(Boolean).join(' ');
}

export function buildStravaPayloadSection(options: {
  account: OAuthAccountSlice | null;
  configured: boolean;
  needsReconnect: boolean;
  status?: string;
  statusMessages?: Record<string, string>;
}): IntegrationsPayload['strava'] {
  const { account, configured, needsReconnect, status, statusMessages = {} } = options;
  return {
    configured,
    account: account
      ? {
          firstName: account.firstName ?? null,
          lastName: account.lastName ?? null,
          avatarUrl: account.avatarUrl ?? null,
          lastSyncAt: isoOrNull(account.lastSyncAt),
        }
      : null,
    needsReconnect,
    statusMessage: status ? statusMessages[status] : undefined,
  };
}

export function buildGarminPayloadSection(
  account: OAuthAccountSlice | null,
  needsReconnect: boolean,
): IntegrationsPayload['garmin'] {
  return {
    account: account
      ? {
          displayName: account.displayName ?? null,
          fullName: account.fullName ?? null,
          lastSyncAt: isoOrNull(account.lastSyncAt),
        }
      : null,
    needsReconnect,
  };
}

export function buildWithingsPayloadSection(options: {
  account: OAuthAccountSlice | null;
  configured: boolean;
  needsReconnect: boolean;
  status?: string;
  detail?: string;
  statusMessages?: Record<string, string>;
}): IntegrationsPayload['withings'] {
  const { account, configured, needsReconnect, status, detail, statusMessages = {} } = options;
  return {
    configured,
    account: account
      ? {
          displayName: account.displayName ?? null,
          lastSyncAt: isoOrNull(account.lastSyncAt),
        }
      : null,
    needsReconnect,
    statusMessage: oauthStatusMessage(statusMessages, status, detail),
  };
}

export function buildRenphoPayloadSection(
  account: OAuthAccountSlice | null,
  needsReconnect: boolean,
): IntegrationsPayload['renpho'] {
  return {
    account: account
      ? {
          email: account.email ?? '',
          displayName: account.displayName ?? null,
          lastSyncAt: isoOrNull(account.lastSyncAt),
        }
      : null,
    needsReconnect,
  };
}

export function buildGooglePayloadSection(options: {
  account: OAuthAccountSlice | null;
  configured: boolean;
  needsReconnect: boolean;
  status?: string;
  detail?: string;
  statusMessages?: Record<string, string>;
}): IntegrationsPayload['google'] {
  const { account, configured, needsReconnect, status, detail, statusMessages = {} } = options;
  return {
    configured,
    account: account
      ? {
          email: account.email ?? null,
          targetCalendarId: account.targetCalendarId ?? null,
          targetCalendarName: account.targetCalendarName ?? null,
          lastSyncAt: isoOrNull(account.lastSyncAt),
        }
      : null,
    needsReconnect,
    statusMessage: oauthStatusMessage(statusMessages, status, detail),
  };
}

export function buildMfpPayloadSection(
  account: OAuthAccountSlice | null,
  configured: boolean,
  needsReconnect: boolean,
): IntegrationsPayload['myfitnesspal'] {
  return {
    configured,
    account: account
      ? {
          displayName: account.displayName ?? null,
          lastSyncAt: isoOrNull(account.lastSyncAt),
        }
      : null,
    needsReconnect,
  };
}
