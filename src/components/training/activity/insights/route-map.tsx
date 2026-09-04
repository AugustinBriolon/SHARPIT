'use client';

import dynamic from 'next/dynamic';
import { memo, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SPORT_IDENTITY_HEX } from '@/lib/activity/sport-identity';
import { cn } from '@/lib/utils';

const RouteMapInner = dynamic(() => import('./route-map-inner'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

function useDeferredMapReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    let cancelled = false;

    const enable = () => {
      if (!cancelled) {
        setReady(true);
      }
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 400 });
    } else {
      timeoutId = globalThis.setTimeout(enable, 120);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return ready;
}

/** MapLibre rejects CSS vars — always pass a concrete hex (sport identity). */
export function RouteMap({
  path,
  lineColor = SPORT_IDENTITY_HEX.OTHER,
  className,
  frameless = false,
}: {
  path: [number, number][];
  lineColor?: string;
  className?: string;
  /** Drop border/radius when parent owns the chrome (e.g. masked preview card). */
  frameless?: boolean;
}) {
  const ready = useDeferredMapReady();

  return (
    <div
      className={cn(
        'relative isolate z-0 h-full w-full overflow-hidden',
        !frameless && 'border-border/60 rounded-xl border',
        className,
      )}
    >
      {ready ? (
        <RouteMapInner lineColor={lineColor} path={path} />
      ) : (
        <Skeleton className="h-full w-full" />
      )}
    </div>
  );
}

export const MemoizedRouteMap = memo(RouteMap);
