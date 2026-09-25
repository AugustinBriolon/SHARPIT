'use client';

import {
  IntegrationAccountSummary,
  IntegrationManageStage,
  IntegrationNotConnectedView,
  IntegrationNotConfiguredView,
  IntegrationSyncActions,
} from '@/components/settings/integrations/modal-parts';
import {
  calendarSelectLabel,
  IntegrationModalHeader,
  type IntegrationContentProps,
} from '@/components/settings/integrations/modal-content-shared';
import { useGoogleContentState } from '@/components/settings/integrations/google-content-hooks';
import {
  GOOGLE_OAUTH_LAN_HINT,
  googleOAuthLocalConnectHref,
  isGoogleOAuthBlockedOnCurrentHost,
} from '@/lib/integrations/google/google-oauth-hint';
import type { GoogleCalendarInfo } from '@/lib/query/fetchers';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function GoogleCalendarTargetPicker({
  calendarId,
  calendars,
  targetCalendarName,
  calendarsQuery,
  savingTarget,
  onSelectCalendar,
}: {
  calendarId: string;
  calendars: GoogleCalendarInfo[];
  targetCalendarName: string | null | undefined;
  calendarsQuery: { isPending: boolean };
  savingTarget: boolean;
  onSelectCalendar: (nextCalendarId: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="google-calendar-target">Calendrier des séances</Label>
      <Select value={calendarId} onValueChange={onSelectCalendar}>
        <SelectTrigger
          className="w-full"
          disabled={calendarsQuery.isPending || savingTarget}
          id="google-calendar-target"
        >
          <SelectValue>
            {calendarSelectLabel(
              calendarId,
              calendars,
              targetCalendarName,
              calendarsQuery.isPending,
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-max max-w-[var(--available-width)] min-w-[var(--anchor-width)]">
          {calendars.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.summary}
              {c.primary ? ' (principal)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function GoogleConnectedManageView({
  integration,
  state,
}: IntegrationContentProps & {
  state: ReturnType<typeof useGoogleContentState>;
}) {
  return (
    <IntegrationManageStage
      confirmTitle="Déconnecter Google Calendar ?"
      disconnecting={state.disconnecting}
      stage={state.stage}
      onCancelConfirm={() => state.setStage('manage')}
      onConfirmDisconnect={state.handleDisconnect}
    >
      <IntegrationModalHeader integration={integration} />
      <IntegrationAccountSummary
        label={integration.account?.label}
        lastSyncAt={integration.account?.lastSyncAt}
      />
      <GoogleCalendarTargetPicker
        calendarId={state.calendarId}
        calendars={state.calendars}
        calendarsQuery={state.calendarsQuery}
        savingTarget={state.savingTarget}
        targetCalendarName={state.targetCalendarName}
        onSelectCalendar={state.handleSelectCalendar}
      />
      <IntegrationSyncActions
        syncDisabled={!state.calendarId}
        syncing={state.syncing}
        onDisconnect={() => state.setStage('confirm')}
        onSync={state.handleSync}
      />
    </IntegrationManageStage>
  );
}

function GoogleNotConfigured({ integration }: IntegrationContentProps) {
  return (
    <IntegrationNotConfiguredView integration={integration}>
      <p>
        Google Calendar n&apos;est pas configuré. Ajoute{' '}
        <code className="text-xs">GOOGLE_CLIENT_ID</code> et{' '}
        <code className="text-xs">GOOGLE_CLIENT_SECRET</code> dans{' '}
        <code className="text-xs">.env</code>.
      </p>
    </IntegrationNotConfiguredView>
  );
}

function GoogleNotConnected({ integration }: IntegrationContentProps) {
  const blockedOnLan = isGoogleOAuthBlockedOnCurrentHost();
  const connectHref = blockedOnLan
    ? `${googleOAuthLocalConnectHref()}?returnTo=/settings/integrations`
    : '/api/google/connect?returnTo=/settings/integrations';

  return (
    <IntegrationNotConnectedView
      body="Le coach planifie tes séances dans ton agenda en évitant tes créneaux occupés."
      connectHref={connectHref}
      integration={integration}
      lanHint={blockedOnLan ? GOOGLE_OAUTH_LAN_HINT : undefined}
    />
  );
}

export function GoogleContent({ integration, onUpdated, onSyncStart }: IntegrationContentProps) {
  const state = useGoogleContentState(integration, onUpdated, onSyncStart);

  if (!integration.configured) {
    return <GoogleNotConfigured integration={integration} />;
  }
  if (!integration.connected) {
    return <GoogleNotConnected integration={integration} />;
  }
  return <GoogleConnectedManageView integration={integration} state={state} />;
}
