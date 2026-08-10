import { Suspense } from 'react';
import { connection } from 'next/server';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import type { SettingsHubStatus } from '@/lib/settings/hub-status';
import { getSettingsHubStatus } from '@/lib/settings/load-hub-status';

async function HubStatusText({ statusKey }: { statusKey: keyof SettingsHubStatus }) {
  // Which travel memory is active depends on the current date, so this is
  // request-time by nature and must never be frozen into the shell.
  await connection();
  const status = await getSettingsHubStatus();
  return status[statusKey];
}

/**
 * A single settings status chip, streamed. The hub list itself carries no
 * server data and stays in the prerendered shell; each chip waits behind its
 * own boundary. `getSettingsHubStatus` is request-memoized, so the chips share
 * one round of queries.
 */
export function HubStatusValue({ statusKey }: { statusKey: keyof SettingsHubStatus }) {
  return (
    <Suspense fallback={<SkeletonDataValue heightClassName="h-3" widthClassName="w-16" />}>
      <HubStatusText statusKey={statusKey} />
    </Suspense>
  );
}
