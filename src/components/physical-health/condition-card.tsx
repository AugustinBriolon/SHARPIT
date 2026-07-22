'use client';

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { PhysicalHealthConditionCard } from '@/core/presentation/physical-health-view-model';
import { CORPS_TONE_TEXT, type CorpsTone } from '@/lib/ui/metric-tone';
import { corpsToneFromPhysicalSeverity } from '@/lib/health/health-status';
import { cn } from '@/lib/utils';

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'IMPROVING') return <TrendingDown className="text-primary size-3.5" />;
  if (trend === 'WORSENING') return <TrendingUp className="text-signal-risk size-3.5" />;
  return <Minus className="text-muted-foreground size-3.5" />;
}

export function PhysicalHealthConditionCardView({
  condition,
  compact = false,
  onEditLegacy,
}: {
  condition: PhysicalHealthConditionCard;
  compact?: boolean;
  onEditLegacy?: (legacyNoteId: string) => void;
}) {
  const tone: CorpsTone = corpsToneFromPhysicalSeverity(condition.severity);

  return (
    <Card
      className={cn(
        'analysis-panel rounded-analysis-lg shadow-none',
        !condition.isActive && 'opacity-75',
      )}
    >
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="text-[10px]" variant="outline">
                {condition.typeLabel}
              </Badge>
              <Badge className="text-[10px]" variant="secondary">
                {condition.statusLabel}
              </Badge>
            </div>
            <h3 className="text-section-title">{condition.label}</h3>
            <p className="text-muted-foreground text-xs">
              {condition.bodyRegion}
              {condition.sideLabel ? ` · ${condition.sideLabel}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className={cn('text-2xl font-semibold tabular-nums', CORPS_TONE_TEXT[tone])}>
              {condition.severity.toFixed(1)}
            </p>
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              sévérité inférée
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {condition.trendLabel && (
            <span className="bg-muted/60 inline-flex items-center gap-1 rounded-full px-2 py-0.5">
              <TrendIcon trend={condition.trend} />
              {condition.trendLabel}
            </span>
          )}
          {condition.functionalCapacityLabel && (
            <span className="bg-muted/60 rounded-full px-2 py-0.5">
              {condition.functionalCapacityLabel}
            </span>
          )}
          <span className="bg-muted/60 rounded-full px-2 py-0.5">
            Confiance {condition.confidencePct}%
          </span>
        </div>
      </CardHeader>

      {!compact && (
        <CardContent className="space-y-3 pt-0">
          {condition.estimatedRecoveryDays != null && condition.isActive && (
            <p className="text-muted-foreground text-xs">
              Estimation de retour au baseline : ~{condition.estimatedRecoveryDays} jours
              <span className="block text-[10px] opacity-80">
                Estimation basée sur l&apos;évolution récente — pas une promesse médicale.
              </span>
            </p>
          )}

          {condition.timelinePreview.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                Timeline récente
              </p>
              <ul className="space-y-1">
                {condition.timelinePreview.map((event, i) => (
                  <li key={i} className="text-muted-foreground text-xs">
                    <span className="text-foreground/80 font-medium">{event.at}</span> —{' '}
                    {event.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {condition.legacyPhysicalNoteId && onEditLegacy && (
              <button
                className="text-primary text-xs font-medium hover:underline"
                type="button"
                onClick={() => onEditLegacy(condition.legacyPhysicalNoteId!)}
              >
                Ajouter une observation
              </button>
            )}
            <Link
              className="text-primary text-xs font-medium hover:underline"
              href={`/biology?tab=suivi&condition=${condition.conditionId}`}
            >
              Voir le détail
            </Link>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
