'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { TrendingDown, TrendingUp, Minus, AlertTriangle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirroring API response shape — no server import on client)
// ─────────────────────────────────────────────────────────────────────────────

type AdaptationStatus =
  | 'POSITIVELY_ADAPTING'
  | 'MAINTAINING'
  | 'PLATEAUING'
  | 'MALADAPTING'
  | 'DETRAINING'
  | 'INSUFFICIENT_DATA';

type AdaptationTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';
type AdaptationVerdict =
  | 'INCREASE_LOAD'
  | 'SUSTAIN'
  | 'CONSOLIDATE'
  | 'REDUCE_LOAD'
  | 'RECOVERY_PRIORITY'
  | 'INSUFFICIENT_DATA';

interface DimensionResult {
  score: number | null;
  available: boolean;
  status: string;
}

interface AdaptationApiResponse {
  adaptationIndex: number | null;
  adaptationStatus: AdaptationStatus;
  adaptationTrend: AdaptationTrend;
  confidence: number;
  dataCompleteness: string;
  dimensions: {
    loadProgression: DimensionResult;
    neuromuscularEfficiency: DimensionResult;
    autonomicAdaptation: DimensionResult;
    recoveryQuality: DimensionResult;
  };
  limitingFactor: string | null;
  estimatedAdaptationPeak: number | null;
  plateauRisk: boolean;
  overreachingWithoutAdaptationDetected: boolean;
  decision: {
    verdict: AdaptationVerdict;
    loadMultiplier: number;
    rationale: string[];
  };
  recommendation: {
    title: string;
    summary: string;
    keyEvidence: string[];
    limitingFactor: string | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Display config
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AdaptationStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  POSITIVELY_ADAPTING: {
    label: 'Adaptation positive',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'from-emerald-500/10 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  MAINTAINING: {
    label: 'Maintien',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'from-blue-500/10 border-blue-500/30',
    dot: 'bg-blue-500',
  },
  PLATEAUING: {
    label: 'Plateau',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'from-amber-500/10 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  MALADAPTING: {
    label: 'Maladaptation',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'from-orange-500/10 border-orange-500/30',
    dot: 'bg-orange-500',
  },
  DETRAINING: {
    label: 'Désentraînement',
    color: 'text-red-600 dark:text-red-400',
    bg: 'from-red-500/10 border-red-500/30',
    dot: 'bg-red-500',
  },
  INSUFFICIENT_DATA: {
    label: 'Données insuffisantes',
    color: 'text-muted-foreground',
    bg: 'from-muted/30 border-border',
    dot: 'bg-muted-foreground',
  },
};

const DIMENSION_LABELS: Record<string, string> = {
  loadProgression: 'Progression charge',
  neuromuscularEfficiency: 'Efficacité NM',
  autonomicAdaptation: 'Adaptation ANS',
  recoveryQuality: 'Qualité récup.',
};

function TrendIcon({ trend }: { trend: AdaptationTrend }) {
  switch (trend) {
    case 'IMPROVING':
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    case 'DECLINING':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="text-muted-foreground h-4 w-4" />;
  }
}

const TREND_LABELS: Record<AdaptationTrend, string> = {
  IMPROVING: 'En progression',
  STABLE: 'Stable',
  DECLINING: 'En déclin',
};

// ─────────────────────────────────────────────────────────────────────────────
// AdaptationIndex gauge (visual indicator 0-100)
// ─────────────────────────────────────────────────────────────────────────────

function AdaptationGauge({ index, status }: { index: number | null; status: AdaptationStatus }) {
  const config = STATUS_CONFIG[status];
  const pct = index !== null ? Math.min(index, 100) : 0;

  return (
    <div className="flex items-end gap-3">
      <span className={cn('font-mono text-5xl leading-none font-bold tabular-nums', config.color)}>
        {index !== null ? index : '—'}
      </span>
      <div className="mb-1 flex-1 space-y-1">
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className={cn('h-full rounded-full transition-all duration-500', config.dot)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-muted-foreground text-xs">/ 100</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension bar
// ─────────────────────────────────────────────────────────────────────────────

function DimensionBar({ label, dimension }: { label: string; dimension: DimensionResult }) {
  if (!dimension.available) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">{label}</span>
        <span className="text-muted-foreground shrink-0 text-xs">—</span>
      </div>
    );
  }

  const score = dimension.score ?? 0;
  const color =
    score >= 70
      ? 'bg-emerald-500'
      : score >= 50
        ? 'bg-blue-500'
        : score >= 30
          ? 'bg-amber-500'
          : 'bg-red-500';

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">{label}</span>
        <span className="text-foreground shrink-0 text-xs font-medium tabular-nums">{score}</span>
      </div>
      <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface AdaptationCardProps {
  date: Date;
  athleteId?: string;
}

export function AdaptationCard({ date, athleteId = 'default' }: AdaptationCardProps) {
  const [data, setData] = useState<AdaptationApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trainingDayId = format(date, 'yyyy-MM-dd');
    setLoading(true);
    setError(null);

    fetch(`/api/adaptation?trainingDayId=${trainingDayId}&athleteId=${athleteId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Erreur lors du chargement');
        return r.json() as Promise<AdaptationApiResponse>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger l'analyse d'adaptation.");
        setLoading(false);
      });
  }, [date, athleteId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
            <Zap className="text-primary h-4 w-4" />
            Adaptation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted h-24 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
            <Zap className="text-primary h-4 w-4" />
            Adaptation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{error ?? 'Données indisponibles.'}</p>
        </CardContent>
      </Card>
    );
  }

  const config = STATUS_CONFIG[data.adaptationStatus];
  const showOverreachingAlert = data.overreachingWithoutAdaptationDetected;
  const showPlateauAlert = data.plateauRisk && !showOverreachingAlert;

  return (
    <Card className={cn('border bg-gradient-to-b to-transparent', config.bg)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Zap className="text-primary h-4 w-4" />
            Adaptation
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', config.dot)} />
            <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <AdaptationGauge index={data.adaptationIndex} status={data.adaptationStatus} />

        {/* Trend row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <TrendIcon trend={data.adaptationTrend} />
            <span className="text-muted-foreground">{TREND_LABELS[data.adaptationTrend]}</span>
          </div>
          {data.decision.loadMultiplier !== 1.0 && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
                data.decision.loadMultiplier > 1
                  ? 'bg-blue-500/10 text-blue-600'
                  : 'bg-amber-500/10 text-amber-600',
              )}
            >
              ×{data.decision.loadMultiplier.toFixed(2)}
            </span>
          )}
        </div>

        {/* Dimension breakdown */}
        <div className="space-y-2">
          {Object.entries(data.dimensions).map(([key, dim]) => (
            <DimensionBar key={key} dimension={dim} label={DIMENSION_LABELS[key] ?? key} />
          ))}
        </div>

        {/* Alerts */}
        {showOverreachingAlert && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-xs text-red-700 dark:text-red-300">
              Surentraînement sans adaptation : charge élevée sans réponse autonomique positive.
              Réduire immédiatement.
            </p>
          </div>
        )}
        {showPlateauAlert && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Plateau détecté : ≥ 14 jours sans progression d'adaptation. Un changement de stimulus
              est nécessaire.
            </p>
          </div>
        )}

        {/* Recommendation */}
        <div className="space-y-1">
          <p className="text-sm font-medium">{data.recommendation.title}</p>
          {data.recommendation.limitingFactor && (
            <p className="text-muted-foreground text-xs">{data.recommendation.limitingFactor}</p>
          )}
        </div>

        {/* Adaptation peak */}
        {data.estimatedAdaptationPeak !== null && (
          <p className="text-muted-foreground text-xs">
            Pic de forme estimé dans{' '}
            <span className="text-foreground font-medium">
              {data.estimatedAdaptationPeak} jour{data.estimatedAdaptationPeak > 1 ? 's' : ''}
            </span>
          </p>
        )}

        {/* Low confidence notice */}
        {data.confidence < 0.5 && (
          <p className="text-muted-foreground text-xs italic">
            Confiance faible — au moins 14 jours de données sont nécessaires pour une évaluation
            complète.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
