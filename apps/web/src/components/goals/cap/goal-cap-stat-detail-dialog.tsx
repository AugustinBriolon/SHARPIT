'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CapStatDetail } from '@/lib/goals/goal-cap-stat-detail';
import type { GoalCapSportShare } from '@/lib/goals/goal-cap-stats';
import type {
  GoalPositionAuditView,
  GoalPositionLeg,
  GoalPositionLegKind,
} from '@/lib/goals/goal-position-audit';
import { SPORT_IDENTITY_HEX } from '@/lib/activity/sport-identity';
import { cn } from '@/lib/utils';

function DetailFacts({ facts }: { facts: CapStatDetail['facts'] }) {
  if (facts.length === 0) {
    return null;
  }
  return (
    <dl className="grid grid-cols-2 gap-3">
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt className="text-muted-foreground text-[11px] font-medium">{fact.label}</dt>
          <dd className="text-data text-foreground mt-0.5 text-sm font-semibold tabular-nums">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ShareBar({ pct }: { pct: number }) {
  return (
    <div className="bg-foreground/10 mt-1.5 h-1 overflow-hidden rounded-full" aria-hidden>
      <div
        className="bg-foreground/45 h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function SportShareList({
  shares,
  mode,
}: {
  shares: readonly GoalCapSportShare[];
  mode: 'sessions' | 'duration' | 'both';
}) {
  if (shares.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-label">Mix du volume</p>
        <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
          Répartition des séances liées au cap — pas l’avancement vers la cible.
        </p>
      </div>
      <ul className="space-y-3">
        {shares.map((share) => (
          <li key={share.type}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-foreground text-sm font-medium">{share.label}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {mode === 'duration'
                  ? share.durationLabel
                  : `${share.sessions} séance${share.sessions > 1 ? 's' : ''}`}
                {mode === 'both' ? ` · ${share.durationLabel}` : null}
              </p>
            </div>
            {mode === 'both' ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-muted-foreground text-[10px]">Part des séances</p>
                <ShareBar pct={share.sessionSharePct} />
                <p className="text-muted-foreground text-[10px]">Part du temps</p>
                <ShareBar pct={share.durationSharePct} />
              </div>
            ) : (
              <ShareBar
                pct={mode === 'sessions' ? share.sessionSharePct : share.durationSharePct}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const LEG_HEX: Record<GoalPositionLegKind, string> = {
  swim: SPORT_IDENTITY_HEX.SWIM,
  t1: SPORT_IDENTITY_HEX.TRIATHLON,
  bike: SPORT_IDENTITY_HEX.BIKE,
  t2: SPORT_IDENTITY_HEX.TRIATHLON,
  run: SPORT_IDENTITY_HEX.RUN,
};

function isTransitionLeg(kind: GoalPositionLegKind): boolean {
  return kind === 't1' || kind === 't2';
}

function CompositionBar({ legs }: { legs: readonly GoalPositionLeg[] }) {
  if (legs.length < 2) {
    return null;
  }

  return (
    <div
      aria-label={legs.map((leg) => `${leg.label} ${leg.sharePct}%`).join(', ')}
      className="flex h-2 overflow-hidden rounded-full"
      role="img"
    >
      {legs.map((leg) => (
        <div
          key={leg.kind}
          className="min-w-0 transition-[flex-grow] duration-200 ease-out"
          style={{
            flexGrow: Math.max(leg.sharePct, isTransitionLeg(leg.kind) ? 2 : 1),
            backgroundColor: LEG_HEX[leg.kind],
            opacity: isTransitionLeg(leg.kind) ? 0.45 : 0.85,
          }}
        />
      ))}
    </div>
  );
}

function ProjectionLegRow({ leg, index }: { leg: GoalPositionLeg; index: number }) {
  const transition = isTransitionLeg(leg.kind);
  return (
    <li>
      {index > 0 ? <div className="border-border/40 ml-1 h-2 border-l" aria-hidden /> : null}
      <div className={cn('flex items-start gap-2.5', transition && 'opacity-80')}>
        <span
          className={cn('mt-1.5 shrink-0 rounded-full', transition ? 'size-1.5' : 'size-2')}
          style={{ backgroundColor: LEG_HEX[leg.kind] }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 pb-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <p
              className={cn(
                'font-medium',
                transition
                  ? 'text-muted-foreground text-xs tracking-wide uppercase'
                  : 'text-foreground text-sm',
              )}
            >
              {leg.label}
            </p>
            <p
              className={cn(
                'text-data font-semibold tabular-nums',
                transition ? 'text-muted-foreground text-xs' : 'text-foreground text-sm',
              )}
            >
              {leg.timeLabel}
            </p>
          </div>
          <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">{leg.source}</p>
        </div>
      </div>
    </li>
  );
}

function ProjectionLegs({ legs }: { legs: readonly GoalPositionLeg[] }) {
  if (legs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <CompositionBar legs={legs} />
      <ol className="space-y-0">
        {legs.map((leg, index) => (
          <ProjectionLegRow key={leg.kind} index={index} leg={leg} />
        ))}
      </ol>
    </div>
  );
}

function PositionCompare({ audit }: { audit: GoalPositionAuditView }) {
  const projectedCaption = audit.comparison === 'measured' ? 'Mesure actuelle' : 'Temps projeté';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-label text-muted-foreground">Cible</p>
          <p className="text-data text-foreground mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
            {audit.targetLabel ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-label text-muted-foreground">{projectedCaption}</p>
          <p className="text-data text-foreground mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
            {audit.projectedLabel ?? '—'}
          </p>
        </div>
      </div>

      {audit.gapLabel ? (
        <p
          className={cn(
            'text-sm leading-snug font-medium',
            audit.tone === 'done' ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {audit.gapLabel}
        </p>
      ) : null}

      <ProjectionLegs legs={audit.legs} />

      {audit.statusBody ? (
        <p className="text-muted-foreground text-sm leading-relaxed">{audit.statusBody}</p>
      ) : null}

      {audit.whenLine ? (
        <p className="text-muted-foreground text-xs tabular-nums">{audit.whenLine}</p>
      ) : null}
    </div>
  );
}

function DialogBody({ detail }: { detail: CapStatDetail }) {
  if (detail.audit) {
    return <PositionCompare audit={detail.audit} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-data text-foreground text-3xl font-semibold tracking-tight tabular-nums">
        {detail.value}
      </p>
      <DetailFacts facts={detail.facts} />
      {detail.sportShareMode ? (
        <SportShareList mode={detail.sportShareMode} shares={detail.sportShares} />
      ) : (
        <p className="text-muted-foreground text-sm">Aucune séance liée pour l’instant.</p>
      )}
    </div>
  );
}

/** Detail sheet opened from a Cap instrument card. */
export function GoalCapStatDetailDialog({
  detail,
  onClose,
}: {
  detail: CapStatDetail | null;
  onClose: () => void;
}) {
  if (!detail) {
    return null;
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{detail.title}</DialogTitle>
          <DialogDescription>{detail.lead}</DialogDescription>
        </DialogHeader>
        <DialogBody detail={detail} />
      </DialogContent>
    </Dialog>
  );
}
