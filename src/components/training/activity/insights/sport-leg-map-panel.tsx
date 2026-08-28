'use client';

import { MemoizedRouteMap as RouteMap } from '@/components/training/activity/insights/route-map';
import type { MultisportLegStream } from '@/lib/streams/streams';
import { sportIdentityHex } from '@/lib/activity/sport-identity';

export function SportLegMapPanel({ entry }: { entry: MultisportLegStream }) {
  const { leg, type, stream } = entry;
  const { path } = stream;
  if (!path || path.length <= 1) {
    return null;
  }

  return (
    <div className="h-72 w-full sm:h-80">
      <RouteMap key={`${type}-${leg.label}`} lineColor={sportIdentityHex(type)} path={path} />
    </div>
  );
}
