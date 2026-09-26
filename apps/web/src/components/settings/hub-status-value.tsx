'use client';

import { useQuery } from '@tanstack/react-query';
import {
  isIntegrationsAttentionLabel,
  type SettingsHubStatus,
} from '@sharpit/server/lib/settings/hub-status';
import { queryKeys } from '@/client/query/keys';
import { fetchSettingsHubPresentation } from '@/client/query/presentation-fetchers';
import { cn } from '@sharpit/server/lib/utils';

export function HubStatusValue({ statusKey }: { statusKey: keyof SettingsHubStatus }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.presentationSettingsHub,
    queryFn: fetchSettingsHubPresentation,
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return <span className="bg-muted inline-block h-3 w-16 animate-pulse rounded-full" />;
  }

  const label = data[statusKey];
  const attention = statusKey === 'integrations' && isIntegrationsAttentionLabel(label);

  return (
    <span className={cn(attention ? 'text-signal-caution' : 'text-muted-foreground')}>{label}</span>
  );
}
