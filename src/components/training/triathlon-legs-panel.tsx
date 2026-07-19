import { Bike, Footprints, Timer, Waves } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistance, formatDuration, formatPace, formatSwimPace } from '@/lib/format';
import {
  legDisplayDurationSec,
  totalTransitionSec,
  type MultisportLeg,
  type MultisportLegKind,
} from '@/lib/multisport';
import { cn } from '@/lib/utils';

const kindIcon: Record<MultisportLegKind, typeof Waves> = {
  swim: Waves,
  bike: Bike,
  run: Footprints,
  transition: Timer,
};

const kindAccent: Record<MultisportLegKind, string> = {
  swim: 'bg-blue-500/10 text-blue-600',
  bike: 'bg-emerald-500/10 text-emerald-600',
  run: 'bg-orange-500/10 text-orange-600',
  transition: 'bg-muted text-muted-foreground',
};

function formatLegPace(leg: MultisportLeg): string | null {
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

function SportLegRow({ leg }: { leg: MultisportLeg }) {
  const Icon = kindIcon[leg.kind];
  const pace = formatLegPace(leg);
  const metrics: string[] = [];

  if (leg.distanceM != null) metrics.push(formatDistance(leg.distanceM));
  metrics.push(formatDuration(leg.durationSec));
  if (pace) metrics.push(pace);
  if (leg.avgHr != null) metrics.push(`FC ${leg.avgHr}`);
  if (leg.elevationM != null && leg.elevationM > 0) metrics.push(`D+${leg.elevationM} m`);

  return (
    <div className="relative flex gap-4">
      <span
        className={cn(
          'relative z-10 grid size-10 shrink-0 place-items-center rounded-xl',
          kindAccent[leg.kind],
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 pb-5">
        <p className="font-medium">{leg.label}</p>
        <p className="text-muted-foreground mt-1 font-mono text-sm tabular-nums">
          {metrics.join(' · ')}
        </p>
      </div>
    </div>
  );
}

function TransitionRow({ leg }: { leg: MultisportLeg }) {
  const displaySec = legDisplayDurationSec(leg);
  const inZone = leg.durationSec > displaySec;

  return (
    <div className="relative flex items-center gap-3 py-1">
      <span
        className={cn(
          'relative z-10 grid size-7 shrink-0 place-items-center rounded-lg',
          kindAccent.transition,
        )}
      >
        <Timer className="size-3.5" />
      </span>
      <div className="bg-muted/40 flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg px-3 py-2">
        <span className="text-muted-foreground text-xs font-medium">{leg.label}</span>
        <span className="font-mono text-sm font-medium tabular-nums">
          {formatDuration(displaySec)}
        </span>
        {inZone && (
          <span className="text-muted-foreground text-[10px] tabular-nums">
            zone {formatDuration(leg.durationSec)}
          </span>
        )}
      </div>
    </div>
  );
}

export function TriathlonLegsPanel({ legs }: { legs: MultisportLeg[] }) {
  if (legs.length === 0) return null;

  const transitionTotal = totalTransitionSec(legs);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <CardTitle className="text-label">Détail multisport</CardTitle>
          {transitionTotal > 0 && (
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              Transitions actives : {formatDuration(transitionTotal)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        {legs.map((leg, index) => {
          const isLast = index === legs.length - 1;
          const isTransition = leg.kind === 'transition';

          return (
            <div key={`${leg.garminActivityId ?? leg.label}-${index}`} className="relative">
              {!isLast && !isTransition && (
                <span
                  className="bg-border absolute top-10 left-5 h-[calc(100%-0.5rem)] w-px"
                  aria-hidden
                />
              )}
              {isTransition ? <TransitionRow leg={leg} /> : <SportLegRow leg={leg} />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
