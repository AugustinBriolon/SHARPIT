'use client';

import dynamic from 'next/dynamic';
import { memo, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SPORT_IDENTITY_HEX } from '@/lib/activity/sport-identity';

const RouteMapInner = dynamic(() => import('./route-map-inner'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

/** MapLibre rejects CSS vars — always pass a concrete hex (sport identity). */
export function RouteMap({
  path,
  lineColor = SPORT_IDENTITY_HEX.OTHER,
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
    <div className="border-border/60 relative isolate z-0 h-full w-full overflow-hidden rounded-xl border">
      {ready ? (
        <RouteMapInner lineColor={lineColor} path={path} />
      ) : (
        <Skeleton className="h-full w-full" />
      )}
    </div>
  );
}

export const MemoizedRouteMap = memo(RouteMap);
