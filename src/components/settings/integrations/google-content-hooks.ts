'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  disconnectGoogleCalendar,
  selectGoogleCalendarTarget,
  syncGoogleCalendar,
} from '@/components/settings/integrations/google-content-actions';
import { useGoogleCalendars } from '@/hooks/use-data';
import type { IntegrationDefinition } from '@/components/settings/integrations/types';

export function useGoogleContentState(integration: IntegrationDefinition, onUpdated?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const calendarsQuery = useGoogleCalendars(integration.connected);
  const calendars = calendarsQuery.data ?? [];
  const [pendingCalendarId, setPendingCalendarId] = useState<string | null>(null);
  const targetCalendarId = integration.account?.extra?.targetCalendarId as string | null;
  const targetCalendarName = integration.account?.extra?.targetCalendarName as string | null;
  const calendarId = pendingCalendarId ?? targetCalendarId ?? '';
  const [savingTarget, setSavingTarget] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleSelectCalendar(nextCalendarId: string | null) {
    if (!nextCalendarId) {
      return;
    }
    setPendingCalendarId(nextCalendarId);
    setSavingTarget(true);
    try {
      await selectGoogleCalendarTarget({
        nextCalendarId,
        calendars,
        router,
        onUpdated,
      });
    } finally {
      setSavingTarget(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await syncGoogleCalendar({ queryClient, router, onUpdated });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectGoogleCalendar({ router, onUpdated });
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
  }

  return {
    calendars,
    calendarsQuery,
    calendarId,
    targetCalendarName,
    savingTarget,
    syncing,
    stage,
    disconnecting,
    handleSelectCalendar,
    handleSync,
    handleDisconnect,
    setStage,
  };
}
