'use client';

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
        'chip-surface rounded-analysis-lg shadow-none',
        !condition.isActive && 'opacity-75',
      )}
    >
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="text-xs" variant="outline">
                {condition.typeLabel}
              </Badge>
              <Badge className="text-xs" variant="secondary">
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
            <p className={cn('text-data text-2xl font-semibold', CORPS_TONE_TEXT[tone])}>
              {condition.severity.toFixed(1)}
            </p>
            <p className="text-label text-muted-foreground">sévérité inférée</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {condition.trendLabel && (
            <span className="bg-muted/60 inline-flex items-center gap-1 rounded-full px-2.5 py-1">
              <TrendIcon trend={condition.trend} />
              {condition.trendLabel}
            </span>
          )}
          {condition.functionalCapacityLabel && (
            <span className="bg-muted/60 inline-flex items-center rounded-full px-2.5 py-1">
              {condition.functionalCapacityLabel}
            </span>
          )}
          <span className="bg-muted/60 inline-flex items-center rounded-full px-2.5 py-1">
            Confiance {condition.confidencePct}%
          </span>
        </div>
      </CardHeader>

      {!compact && (
        <CardContent className="space-y-3 pt-0">
          {condition.estimatedRecoveryDays != null && condition.isActive && (
            <p className="text-muted-foreground text-xs">
              Estimation de retour au baseline : ~{condition.estimatedRecoveryDays} jours
              <span className="block text-xs opacity-80">
                Estimation basée sur l&apos;évolution récente — pas une promesse médicale.
              </span>
            </p>
          )}

          {condition.timelinePreview.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-label text-muted-foreground">Timeline récente</p>
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
        </CardContent>
      )}

      <CardContent className={cn('pt-0', !compact && '-mt-3')}>
        <div className="flex flex-wrap gap-2 pt-1">
          {condition.legacyPhysicalNoteId && onEditLegacy && (
            <button
              className="bg-highlight text-highlight-foreground hover:bg-highlight/90 inline-flex min-h-11 items-center rounded-full px-4 py-2 text-xs font-semibold transition-colors lg:min-h-9 lg:px-3.5 lg:py-1.5"
              type="button"
              onClick={() => onEditLegacy(condition.legacyPhysicalNoteId!)}
            >
              Ajouter une observation
            </button>
          )}
          <ConditionDetailDialog condition={condition} />
        </div>
      </CardContent>
    </Card>
  );
}

function SeveritySparkline({
  points,
}: {
  points: Array<{ date: string; severity: number | null }>;
}) {
  const valid = points.filter((p) => p.severity != null) as Array<{
    date: string;
    severity: number;
  }>;
  if (valid.length < 2) {
    return <p className="text-muted-foreground text-xs">Pas assez de données pour le graphe.</p>;
  }

  const max = Math.max(...valid.map((p) => p.severity), 1);

  return (
    <div className="flex items-end gap-px" style={{ height: 48 }}>
      {valid.map((p, i) => {
        const h = Math.max(2, (p.severity / max) * 48);
        const tone = corpsToneFromPhysicalSeverity(p.severity);
        return (
          <div
            key={i}
            style={{ height: h }}
            title={`${p.date}: ${p.severity}`}
            className={cn(
              'flex-1 rounded-t-sm',
              tone === 'ok' && 'bg-primary/60',
              tone === 'watch' && 'bg-amber-400/70',
              tone === 'attention' && 'bg-signal-risk/70',
              tone === 'neutral' && 'bg-muted-foreground/40',
            )}
          />
        );
      })}
    </div>
  );
}

function ConditionDetailDialog({ condition }: { condition: PhysicalHealthConditionCard }) {
  const [open, setOpen] = useState(false);
  const tone = corpsToneFromPhysicalSeverity(condition.severity);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="chip-surface text-foreground/80 hover:text-foreground inline-flex min-h-11 items-center rounded-full px-4 py-2 text-xs font-medium transition-colors lg:min-h-9 lg:px-3.5 lg:py-1.5">
        Voir le détail
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{condition.label}</DialogTitle>
          <p className="text-muted-foreground text-sm">
            {condition.bodyRegion}
            {condition.sideLabel ? ` · ${condition.sideLabel}` : ''} · {condition.typeLabel}
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-baseline gap-3">
            <span className={cn('text-data text-3xl font-semibold', CORPS_TONE_TEXT[tone])}>
              {condition.severity.toFixed(1)}
            </span>
            <span className="text-muted-foreground text-sm">sévérité inférée</span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {condition.functionalCapacityLabel && (
              <span className="bg-muted/60 rounded-full px-2.5 py-1">
                {condition.functionalCapacityLabel}
              </span>
            )}
            {condition.trendLabel && (
              <span className="bg-muted/60 inline-flex items-center gap-1 rounded-full px-2.5 py-1">
                <TrendIcon trend={condition.trend} />
                {condition.trendLabel}
              </span>
            )}
            <span className="bg-muted/60 rounded-full px-2.5 py-1">
              Confiance {condition.confidencePct}%
            </span>
            <span className="bg-muted/60 rounded-full px-2.5 py-1">
              {condition.observationCount} observation{condition.observationCount > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="text-label text-muted-foreground">Évolution de la sévérité</p>
            <SeveritySparkline points={condition.sparkline} />
          </div>

          {condition.timelinePreview.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-label text-muted-foreground">Observations récentes</p>
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

          {condition.estimatedRecoveryDays != null && condition.isActive && (
            <p className="text-muted-foreground text-xs">
              Retour au baseline estimé : ~{condition.estimatedRecoveryDays} jours
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
