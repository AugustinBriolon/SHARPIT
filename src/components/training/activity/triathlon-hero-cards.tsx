'use client';

import { Bike, Footprints, Waves } from 'lucide-react';
import { ActivityType } from '@prisma/client';
import {
  SPORT_IDENTITY_PANEL,
  SPORT_IDENTITY_SURFACE,
  SPORT_IDENTITY_TEXT,
} from '@/lib/activity/sport-identity';
import { formatDistance, formatDuration, formatPace, formatSwimPace } from '@/lib/format';
import {
  legDisplayDurationSec,
  totalTransitionSec,
  transitionLegs,
  type MultisportLeg,
} from '@/lib/multisport';
import { cn } from '@/lib/utils';

const kindIcon: Record<'swim' | 'bike' | 'run', typeof Waves> = {
  swim: Waves,
  bike: Bike,
  run: Footprints,
};

const kindToActivityType: Record<'swim' | 'bike' | 'run', ActivityType> = {
  swim: ActivityType.SWIM,
  bike: ActivityType.BIKE,
  run: ActivityType.RUN,
};

type SportLeg = MultisportLeg & { kind: 'swim' | 'bike' | 'run' };

function formatLegPace(leg: SportLeg): string | null {
  if (leg.avgSpeedMs == null || leg.avgSpeedMs <= 0) return null;
  switch (leg.kind) {
    case 'swim':
      return formatSwimPace(100 / leg.avgSpeedMs);
    case 'run':
      return formatPace(1000 / leg.avgSpeedMs);
    case 'bike':
      return `${(leg.avgSpeedMs * 3.6).toFixed(1)} km/h`;
    default:
      return null;
  }
}

function SportCard({ leg }: { leg: SportLeg }) {
  const Icon = kindIcon[leg.kind];
  const sportType = kindToActivityType[leg.kind];
  const pace = formatLegPace(leg);
  const subParts: string[] = [];
  if (pace) subParts.push(pace);
  if (leg.avgHr != null) subParts.push(`FC ${leg.avgHr}`);
  if (leg.elevationM != null && leg.elevationM > 0) subParts.push(`D+${leg.elevationM} m`);

  return (
    <div
      className={cn(
        'rounded-analysis-lg relative overflow-hidden border px-4 py-4',
        SPORT_IDENTITY_PANEL[sportType],
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            'grid size-8 place-items-center rounded-lg',
            SPORT_IDENTITY_SURFACE[sportType],
          )}
        >
          <Icon className="size-4" />
        </span>
        <p className={cn('text-label', SPORT_IDENTITY_TEXT[sportType])}>{leg.label}</p>
      </div>
      <p className="font-mono text-2xl font-semibold tabular-nums">
        {leg.distanceM != null ? formatDistance(leg.distanceM) : formatDuration(leg.durationSec)}
      </p>
      <p className="text-muted-foreground mt-1 font-mono text-sm tabular-nums">
        {leg.distanceM != null ? formatDuration(leg.durationSec) : null}
      </p>
      {subParts.length > 0 && (
        <p className="text-muted-foreground mt-2 text-xs">{subParts.join(' · ')}</p>
      )}
    </div>
  );
}

export function TriathlonHeroCards({ legs }: { legs: MultisportLeg[] }) {
  const sportLegs = legs.filter((leg): leg is SportLeg => leg.kind !== 'transition');
  const transitions = transitionLegs(legs);
  const transitionTotal = totalTransitionSec(legs);

  if (sportLegs.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {sportLegs.map((leg) => (
          <SportCard key={leg.label} leg={leg} />
        ))}
      </div>

      {transitions.length > 0 && (
        <div className="border-border/60 bg-muted/20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            Transitions
          </span>
          {transitions.map((leg) => (
            <span
              key={leg.label}
              className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums"
            >
              <span className="text-muted-foreground text-xs">{leg.label}</span>
              <span className="font-medium">{formatDuration(legDisplayDurationSec(leg))}</span>
              {leg.movingDurationSec != null &&
                leg.movingDurationSec > 0 &&
                leg.movingDurationSec < leg.durationSec && (
                  <span className="text-muted-foreground text-[10px]">
                    (zone {formatDuration(leg.durationSec)})
                  </span>
                )}
            </span>
          ))}
          {transitionTotal > 0 && (
            <span className="text-muted-foreground ml-auto font-mono text-xs tabular-nums">
              Total {formatDuration(transitionTotal)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
