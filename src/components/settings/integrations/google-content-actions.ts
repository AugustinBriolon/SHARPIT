import type { QueryClient } from '@tanstack/react-query';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { invalidateAfterProviderSync } from '@/lib/query/invalidate-after-provider-sync';
import { runGoogleSync } from '@/lib/integrations/shared/client-sync';
import { toast } from '@/components/ui/toast';
import type { GoogleCalendarInfo } from '@/lib/query/fetchers';

export function googleSyncErrorDescription(err: unknown): string | undefined {
  if (!(err instanceof Error)) {
    return undefined;
  }
  if (err.message.includes('Reconnecte')) {
    return `${err.message} Utilise le bouton « Connecter Google Calendar » ci-dessous.`;
  }
  return err.message;
}

/** Persist selected calendar — caller owns Instant UI (optimistic id + rollback). */
export async function selectGoogleCalendarTarget(options: {
  nextCalendarId: string;
  calendars: GoogleCalendarInfo[];
  router: AppRouterInstance;
  onUpdated?: () => void;
}): Promise<void> {
  const calendar = options.calendars.find((c) => c.id === options.nextCalendarId);
  const response = await fetch('/api/google/select-calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      calendarId: options.nextCalendarId,
      calendarName: calendar?.summary ?? null,
    }),
  });
  if (!response.ok) {
    throw new Error('Impossible de changer le calendrier cible.');
  }
  options.router.refresh();
  options.onUpdated?.();
}

export async function syncGoogleCalendar(options: {
  queryClient: QueryClient;
  router: AppRouterInstance;
  onUpdated?: () => void;
}): Promise<void> {
  await toast.promise(runGoogleSync(), {
    loading: 'Synchronisation Google Calendar…',
    success: (d) => ({
      title: 'Google synchronisé',
      description: `${d.pushed} ajoutée(s), ${d.updated} mise(s) à jour.`,
    }),
    error: (err) => ({
      title: 'Échec Google',
      description: googleSyncErrorDescription(err),
    }),
  });
  await invalidateAfterProviderSync(options.queryClient, { includeBodyComposition: false });
  options.router.refresh();
  options.onUpdated?.();
}

export async function disconnectGoogleCalendar(options: {
  router: AppRouterInstance;
  onUpdated?: () => void;
}): Promise<void> {
  await fetch('/api/google/disconnect', { method: 'POST' });
  options.router.refresh();
  options.onUpdated?.();
}
