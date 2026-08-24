'use client';

import type { ReactNode } from 'react';
import { useDisplayMode } from '@/providers/display-mode-provider';

/**
 * Renders its children only for the expert reading.
 *
 * Nothing is fetched or computed differently — the block is simply not shown to
 * an athlete who did not ask for the technical layer. It stays silent while the
 * density is unknown so an expert block never flashes in and out.
 */
export function ExpertOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isExpert, isResolved } = useDisplayMode();

  if (!isResolved) return null;
  return isExpert ? <>{children}</> : <>{fallback}</>;
}
