'use client';

import dynamic from 'next/dynamic';
import { memo, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const RouteMapInner = dynamic(() => import('./route-map-inner'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export function RouteMap({
  path,
  lineColor = '#0891b2',
}: {
  path: [number, number][];
  lineColor?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    let cancelled = false;

    const enable = () => {
      if (!cancelled) setReady(true);
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 400 });
    } else {
      timeoutId = globalThis.setTimeout(enable, 120);
    }

    return () => {
      cancelled = true;
      if (idleId != null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="border-border/60 relative h-full w-full overflow-hidden rounded-xl border">
      {ready ? (
        <RouteMapInner lineColor={lineColor} path={path} />
      ) : (
        <Skeleton className="h-full w-full" />
      )}
      <span className="text-muted-foreground/70 pointer-events-none absolute right-2 bottom-1 z-400 text-[9px]">
        © OpenStreetMap · CARTO
      </span>
    </div>
  );
}

export const MemoizedRouteMap = memo(RouteMap);
