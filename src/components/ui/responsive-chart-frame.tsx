'use client';

import type { ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

/** Conteneur Recharts avec dimensions explicites (évite width/height 0). */
export function ResponsiveChartFrame({
  height,
  children,
  className,
}: {
  height: number;
  children: ReactElement;
  className?: string;
}) {
  return (
    <div className={cn('w-full min-w-0', className)} style={{ height }}>
      <ResponsiveContainer height={height} minWidth={0} width="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
