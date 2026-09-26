'use client';

import type { MultisportLegStream } from '@sharpit/app/lib/streams/stream-types';
import { SportLegUnavailable } from '@/components/training/activity/insights/sport-leg-unavailable';
import { SportLegStreamBody } from '@/components/training/activity/insights/sport-leg-stream-body';

export function SportLegInsights({ entry }: { entry: MultisportLegStream }) {
  if (!entry.stream.available) {
    return <SportLegUnavailable label={entry.leg.label} />;
  }

  return <SportLegStreamBody entry={entry} />;
}
