'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  disconnectGoogleCalendar,
  selectGoogleCalendarTarget,
  syncGoogleCalendar,
} from '@/components/settings/integrations/google-content-actions';
import { notifyIntegrationSyncStarted } from '@/components/settings/integrations/modal-sync-start';
import { useGoogleCalendars } from '@/hooks/use-data';
import type { IntegrationDefinition } from '@/components/settings/integrations/types';
import { toast } from '@/components/ui/toast';

export function useGoogleCalendarSelection(
  integration: IntegrationDefinition,
  onUpdated?: () => void,
) {
  const router = useRouter();
  const calendarsQuery = useGoogleCalendars(integration.connected);
  const calendars = calendarsQuery.data ?? [];
  const [pendingCalendarId, setPendingCalendarId] = useState<string | null>(null);
  const targetCalendarId = integration.account?.extra?.targetCalendarId as string | null;
  const targetCalendarName = integration.account?.extra?.targetCalendarName as string | null;
  const calendarId = pendingCalendarId ?? targetCalendarId ?? '';

  function handleSelectCalendar(nextCalendarId: string | null) {
    if (!nextCalendarId || nextCalendarId === calendarId) {
      return;
    }
    setPendingCalendarId(nextCalendarId);
    void selectGoogleCalendarTarget({
      nextCalendarId,
      calendars,
      router,
      onUpdated,
    }).catch((err: unknown) => {
      setPendingCalendarId(null);
      toast.error('Impossible de changer le calendrier', {
        description: err instanceof Error ? err.message : undefined,
      });
    });
  }

  return {
    calendars,
    calendarsQuery,
    calendarId,
    targetCalendarName,
    savingTarget: false,
    handleSelectCalendar,
  };
}

export function useGoogleSync(onUpdated?: () => void, onSyncStart?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    notifyIntegrationSyncStarted({ onSyncStart });
    setSyncing(true);
    try {
      await syncGoogleCalendar({ queryClient, router, onUpdated });
    } finally {
      setSyncing(false);
    }
  }

  return { syncing, handleSync };
}

export function useGoogleDisconnect(onUpdated?: () => void) {
  const router = useRouter();
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectGoogleCalendar({ router, onUpdated });
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
  }

  return { stage, setStage, disconnecting, handleDisconnect };
}
