'use client';

import { useQuery } from '@tanstack/react-query';
import type { SettingsHubStatus } from '@/lib/settings/hub-status';

async function fetchHubStatus(): Promise<SettingsHubStatus> {
  const res = await fetch('/api/presentation/settings-hub');
  if (!res.ok) {
    throw new Error('Failed to load settings hub status');
  }
  return res.json();
}

export function HubStatusValue({ statusKey }: { statusKey: keyof SettingsHubStatus }) {
  const { data, isLoading } = useQuery({
    queryKey: ['presentation', 'settings-hub'],
    queryFn: fetchHubStatus,
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return <span className="bg-muted inline-block h-3 w-16 animate-pulse rounded-full" />;
  }

  return <>{data[statusKey]}</>;
}
