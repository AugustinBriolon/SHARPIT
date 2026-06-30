'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const RouteMapInner = dynamic(() => import('./route-map-inner'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export function RouteMap({ path }: { path: [number, number][] }) {
  return (
    <div className="border-border/60 relative h-full w-full overflow-hidden rounded-xl border">
      <RouteMapInner path={path} />
      <span className="text-muted-foreground/70 pointer-events-none absolute right-2 bottom-1 z-[400] text-[9px]">
        © OpenStreetMap · CARTO
      </span>
    </div>
  );
}
