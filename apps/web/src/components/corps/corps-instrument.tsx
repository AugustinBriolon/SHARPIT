import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Corps instrument column — one causal stack, not a collage of hubs.
 * Order on the page: composition (plate→chips→why→evidence) → suivi → identité.
 */
export function CorpsInstrument({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('flex flex-col gap-5 lg:gap-6', className)}>{children}</div>;
}

export function CorpsInstrumentBlock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
