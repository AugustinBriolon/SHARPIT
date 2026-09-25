'use client';

import type { ReactNode } from 'react';
import { useDisplayMode } from '@/providers/display-mode-provider';

/**
 * Renders its children only for the expert reading.
 *
 * Nothing is fetched or computed differently — the block is simply not shown to
 * an athlete who did not ask for the technical layer. While the density is
 * unknown it shows `fallback` (default null) so an expert block never flashes
 * in and then disappears.
 */
export function ExpertOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isExpert, isResolved } = useDisplayMode();

  if (!isResolved) {
    return <>{fallback}</>;
  }
  return isExpert ? <>{children}</> : <>{fallback}</>;
}
