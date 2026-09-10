'use client';

import Link from 'next/link';
import { IntegrationLogo } from '@/components/settings/integrations/logos';
import type { IntegrationDefinition } from '@/components/settings/integrations/types';
import type { GoogleCalendarInfo } from '@/lib/query/fetchers';
import type { RecordChange } from '@/lib/training/records';

export type IntegrationContentProps = {
  integration: IntegrationDefinition;
  onUpdated?: () => void;
  onSyncStart?: () => void;
};

export function calendarSelectLabel(
  calendarId: string,
  calendars: GoogleCalendarInfo[],
  targetCalendarName: string | null | undefined,
  loadingCalendars: boolean,
): string {
  if (!calendarId) {
    if (loadingCalendars) {
      return 'Chargement…';
    }
    return 'Choisir un calendrier (ex: SPORT)';
  }
  return calendars.find((c) => c.id === calendarId)?.summary ?? targetCalendarName ?? calendarId;
}

export function RecordChangesBanner({ changes }: { changes: RecordChange[] }) {
  if (changes.length === 0) {
    return null;
  }

  return (
    <div className="border-primary/30 bg-primary/5 rounded-xl border p-3 text-sm">
      <p className="text-primary font-medium">
        {changes.length} record{changes.length > 1 ? 's' : ''} battu
        {changes.length > 1 ? 's' : ''}
      </p>
      <ul className="mt-2 space-y-1.5">
        {changes.map((c) => (
          <li key={c.category} className="flex flex-wrap items-baseline gap-x-1">
            {c.activityId ? (
              <Link
                className="hover:text-primary font-medium hover:underline"
                href={`/activite/${c.activityId}`}
              >
                {c.label}
              </Link>
            ) : (
              <span className="font-medium">{c.label}</span>
            )}
            <span className="text-muted-foreground">—</span>
            <span className="font-mono font-semibold tabular-nums">{c.displayValue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EnvSetupBlock({ children }: { children: React.ReactNode }) {
  return <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">{children}</div>;
}

export function IntegrationModalHeader({ integration }: { integration: IntegrationDefinition }) {
  return (
    <div className="flex items-start gap-3">
      <IntegrationLogo className="size-11 shrink-0" id={integration.id} />
      <div className="flex flex-wrap gap-1.5 pt-1">
        {integration.dataTypes.map((tag) => (
          <span
            key={tag}
            className="bg-muted/80 text-muted-foreground text-label rounded-full px-2 py-0.5"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
