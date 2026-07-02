'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Activity, TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirroring API response shape — no server import on client)
// ─────────────────────────────────────────────────────────────────────────────

type FatigueLevel =
  | 'FRESH'
  | 'FUNCTIONAL_LOW'
  | 'FUNCTIONAL_HIGH'
  | 'ACCUMULATED'
  | 'NON_FUNCTIONAL_RISK'
  | 'OVERREACHING_RISK'
  | 'INSUFFICIENT_DATA';

type FatigueTrajectory = 'RESOLVING' | 'STABLE' | 'ACCUMULATING' | 'ACCELERATING';
type TrainingCapacity = 'FULL' | 'REDUCED' | 'LIGHT_ONLY' | 'REST_ONLY';

interface FatigueApiResponse {
  fatigueIndex: number | null;
  fatigueLevel: FatigueLevel;
  trajectory: FatigueTrajectory;
  trainingCapacity: TrainingCapacity;
  primaryLimitingFactor: string | null;
  estimatedTimeToFresh: number | null;
  performanceImpairmentEstimate: number;
  confidence: number;
  recommendation: {
    title: string;
    summary: string;
  };
  signals: {
    functionalOverreachingRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    isAccumulating: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Display config
// ─────────────────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<
  FatigueLevel,
  { label: string; color: string; bg: string; dot: string }
> = {
  FRESH: {
    label: 'Frais',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'from-emerald-500/10 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  FUNCTIONAL_LOW: {
    label: 'Fatigue normale',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'from-blue-500/10 border-blue-500/30',
    dot: 'bg-blue-500',
  },
  FUNCTIONAL_HIGH: {
    label: 'Charge productive',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'from-amber-500/10 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  ACCUMULATED: {
    label: 'Fatigue accumulée',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'from-orange-500/10 border-orange-500/30',
    dot: 'bg-orange-500',
  },
  NON_FUNCTIONAL_RISK: {
    label: 'Risque surcharge',
    color: 'text-red-600 dark:text-red-400',
    bg: 'from-red-500/10 border-red-500/30',
    dot: 'bg-red-500',
  },
  OVERREACHING_RISK: {
    label: 'Surentraînement',
    color: 'text-red-700 dark:text-red-300',
    bg: 'from-red-600/15 border-red-600/40',
    dot: 'bg-red-600',
  },
  INSUFFICIENT_DATA: {
    label: 'Données insuffisantes',
    color: 'text-muted-foreground',
    bg: 'from-muted/30 border-border',
    dot: 'bg-muted-foreground',
  },
};

const CAPACITY_LABELS: Record<TrainingCapacity, string> = {
  FULL: 'Capacité totale',
  REDUCED: 'Capacité réduite',
  LIGHT_ONLY: 'Léger uniquement',
  REST_ONLY: 'Repos',
};

function TrajectoryIcon({ trajectory }: { trajectory: FatigueTrajectory }) {
  switch (trajectory) {
    case 'RESOLVING':
      return <TrendingDown className="h-4 w-4 text-emerald-500" />;
    case 'ACCUMULATING':
    case 'ACCELERATING':
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="text-muted-foreground h-4 w-4" />;
  }
}

const TRAJECTORY_LABELS: Record<FatigueTrajectory, string> = {
  RESOLVING: 'En baisse',
  STABLE: 'Stable',
  ACCUMULATING: 'En hausse',
  ACCELERATING: 'Accélère',
};

// ─────────────────────────────────────────────────────────────────────────────
// FatigueIndex gauge (visual indicator 0-100)
// ─────────────────────────────────────────────────────────────────────────────

function FatigueGauge({ index, level }: { index: number | null; level: FatigueLevel }) {
  const config = LEVEL_CONFIG[level];
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
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface FatigueCardProps {
  date: Date;
  athleteId?: string;
}

export function FatigueCard({ date, athleteId = 'default' }: FatigueCardProps) {
  const [data, setData] = useState<FatigueApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trainingDayId = format(date, 'yyyy-MM-dd');
    setLoading(true);
    setError(null);

    fetch(`/api/fatigue?trainingDayId=${trainingDayId}&athleteId=${athleteId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Erreur lors du chargement');
        return r.json() as Promise<FatigueApiResponse>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger l'analyse de fatigue.");
        setLoading(false);
      });
  }, [date, athleteId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
            <Activity className="text-primary h-4 w-4" />
            Fatigue
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
            <Activity className="text-primary h-4 w-4" />
            Fatigue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{error ?? 'Données indisponibles.'}</p>
        </CardContent>
      </Card>
    );
  }

  const config = LEVEL_CONFIG[data.fatigueLevel];
  const showAlert =
    data.signals.functionalOverreachingRisk === 'HIGH' ||
    data.signals.functionalOverreachingRisk === 'CRITICAL';

  return (
    <Card className={cn('border bg-gradient-to-b to-transparent', config.bg)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Activity className="text-primary h-4 w-4" />
            Fatigue
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', config.dot)} />
            <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <FatigueGauge index={data.fatigueIndex} level={data.fatigueLevel} />

        {/* Trajectory + capacity row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <TrajectoryIcon trajectory={data.trajectory} />
            <span className="text-muted-foreground">{TRAJECTORY_LABELS[data.trajectory]}</span>
          </div>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              data.trainingCapacity === 'FULL'
                ? 'bg-emerald-500/10 text-emerald-600'
                : data.trainingCapacity === 'REDUCED'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-red-500/10 text-red-600',
            )}
          >
            {CAPACITY_LABELS[data.trainingCapacity]}
          </span>
        </div>

        {/* Overreaching alert */}
        {showAlert && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-xs text-red-700 dark:text-red-300">
              {data.signals.functionalOverreachingRisk === 'CRITICAL'
                ? 'Risque critique de surentraînement — réduction de charge obligatoire.'
                : 'Risque élevé de surentraînement. Une semaine de récupération est recommandée.'}
            </p>
          </div>
        )}

        {/* Recommendation */}
        <div className="space-y-1">
          <p className="text-sm font-medium">{data.recommendation.title}</p>
          {data.primaryLimitingFactor && (
            <p className="text-muted-foreground text-xs">{data.primaryLimitingFactor}</p>
          )}
        </div>

        {/* Time to fresh */}
        {data.estimatedTimeToFresh !== null && data.fatigueLevel !== 'FRESH' && (
          <p className="text-muted-foreground text-xs">
            Retour à l'état frais estimé dans{' '}
            <span className="text-foreground font-medium">
              {data.estimatedTimeToFresh === 14
                ? '14+ jours'
                : `${data.estimatedTimeToFresh} jour${data.estimatedTimeToFresh > 1 ? 's' : ''}`}
            </span>
          </p>
        )}

        {/* Confidence */}
        {data.confidence < 0.5 && (
          <p className="text-muted-foreground text-xs italic">
            Confiance faible — connectez un cardiofréquencemètre et renseignez vos séances pour
            améliorer la précision.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
