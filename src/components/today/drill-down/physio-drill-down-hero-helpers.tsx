'use client';

import type { ReactNode } from 'react';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

export function quickReadBadge({
  loading,
  quickReadValue,
  quickReadLabel,
  quickReadSuffix,
}: {
  loading: boolean;
  quickReadValue: string | null | undefined;
  quickReadLabel?: string | null;
  quickReadSuffix?: string | null;
}): ReactNode {
  if (loading && quickReadValue !== null) {
    return <SkeletonDataValue heightClassName="h-7" widthClassName="w-12" />;
  }
  if (quickReadValue !== null) {
    return (
      <span
        className="bg-highlight text-highlight-foreground text-data inline-flex items-baseline gap-1 rounded-full px-3 py-1 text-sm font-semibold"
        title={quickReadLabel ?? undefined}
      >
        {quickReadValue}
        {quickReadSuffix ? <span className="text-xs font-normal">{quickReadSuffix}</span> : null}
      </span>
    );
  }
  return null;
}
