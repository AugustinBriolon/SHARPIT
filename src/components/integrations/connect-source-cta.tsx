'use client';

import { LinkButton } from '@/components/ui/link-button';
import { cn } from '@/lib/utils';

/**
 * Primary empty-state CTA when a surface needs a connected provider.
 * Points at the integrations hub — Garmin is the live activities + wearable path.
 */
export function ConnectSourceCta({
  label = 'Connecter Garmin',
  className,
  size = 'sm',
}: {
  label?: string;
  className?: string;
  size?: 'sm' | 'default';
}) {
  return (
    <LinkButton className={className} href="/settings/integrations" size={size}>
      {label}
    </LinkButton>
  );
}

/** Dual path for activity empties: sync Garmin or log manually. */
export function ActivitySourceEmptyActions({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <ConnectSourceCta />
      <LinkButton href="/activite/nouvelle" size="sm" variant="outline">
        Saisir manuellement
      </LinkButton>
    </div>
  );
}
