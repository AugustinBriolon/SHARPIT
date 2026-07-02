'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirroring API response shape — no server import on client)
// ─────────────────────────────────────────────────────────────────────────────

type OverallVerdict =
  | 'TRAIN_HARD'
  | 'TRAIN_SMART'
  | 'TRAIN_EASY'
  | 'RECOVER'
  | 'RACE_READY'
  | 'CAUTION'
  | 'INSUFFICIENT_DATA';

type PhysiologicalConsistency =
  'ALIGNED' | 'PARTIALLY_ALIGNED' | 'CONFLICTING' | 'INSUFFICIENT_DATA';

type FindingSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

interface KeyFinding {
  id: string;
  category: string;
  severity: FindingSeverity;
  title: string;
  evidence: string[];
  confidence: number;
}

interface Opportunity {
  id: string;
  type: string;
  title: string;
  rationale: string;
  expectedBenefit: number;
  timeWindow: string;
}

interface Conflict {
  id: string;
  type: string;
  description: string;
  models: string[];
  resolution: string;
}

interface TopAction {
  verb: string;
  focus: string;
  rationale: string;
  expectedBenefit: number;
}

interface EvidenceGraph {
  recoveryContribution: number;
  fatigueContribution: number;
  adaptationContribution: number;
}

interface ReasoningApiResponse {
  overallVerdict: OverallVerdict;
  physiologicalConsistency: PhysiologicalConsistency;
  consistencyScore: number;
  confidence: number;
  dataCompleteness: string;
  systemAttentionPriority: string;
  keyFindings: KeyFinding[];
  limitingFactor: { system: string | null; description: string | null; actionable: boolean };
  opportunities: Opportunity[];
  conflicts: Conflict[];
  topAction: TopAction | null;
  evidenceGraph: EvidenceGraph;
}

// ─────────────────────────────────────────────────────────────────────────────
// Display config
// ─────────────────────────────────────────────────────────────────────────────

const VERDICT_CONFIG: Record<
  OverallVerdict,
  { label: string; color: string; bg: string; dot: string }
> = {
  TRAIN_HARD: {
    label: 'Entraîne-toi fort',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'from-emerald-500/10 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  RACE_READY: {
    label: 'Pic de forme',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'from-emerald-500/10 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  TRAIN_SMART: {
    label: 'Entraîne-toi malin',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'from-blue-500/10 border-blue-500/30',
    dot: 'bg-blue-500',
  },
  TRAIN_EASY: {
    label: 'Entraîne-toi doucement',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'from-amber-500/10 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  CAUTION: {
    label: 'Prudence — conflits détectés',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'from-orange-500/10 border-orange-500/30',
    dot: 'bg-orange-500',
  },
  RECOVER: {
    label: 'Récupère',
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

const CONSISTENCY_LABELS: Record<PhysiologicalConsistency, string> = {
  ALIGNED: 'Alignés',
  PARTIALLY_ALIGNED: 'Partiellement alignés',
  CONFLICTING: 'En conflit',
  INSUFFICIENT_DATA: 'Données insuffisantes',
};

const CONSISTENCY_COLOR: Record<PhysiologicalConsistency, string> = {
  ALIGNED: 'text-emerald-600 dark:text-emerald-400',
  PARTIALLY_ALIGNED: 'text-amber-600 dark:text-amber-400',
  CONFLICTING: 'text-red-600 dark:text-red-400',
  INSUFFICIENT_DATA: 'text-muted-foreground',
};

const SEVERITY_CONFIG: Record<FindingSeverity, { badge: string; dot: string }> = {
  CRITICAL: { badge: 'bg-red-500/10 text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  WARNING: { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  INFO: { badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
};

const MODEL_LABELS: Record<string, string> = {
  recovery: 'Récup.',
  fatigue: 'Fatigue',
  adaptation: 'Adaptation',
};

// ─────────────────────────────────────────────────────────────────────────────
// Evidence graph
// ─────────────────────────────────────────────────────────────────────────────

function EvidenceBar({ label, contribution }: { label: string; contribution: number }) {
  const pct = Math.round(contribution * 100);
  const color = pct >= 40 ? 'bg-primary' : pct >= 20 ? 'bg-primary/60' : 'bg-muted-foreground/30';

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="text-foreground text-xs font-medium tabular-nums">{pct}%</span>
      </div>
      <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface ReasoningCardProps {
  date: Date;
  athleteId?: string;
}

export function ReasoningCard({ date, athleteId = 'default' }: ReasoningCardProps) {
  const [data, setData] = useState<ReasoningApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trainingDayId = format(date, 'yyyy-MM-dd');
    setLoading(true);
    setError(null);

    fetch(`/api/reasoning?trainingDayId=${trainingDayId}&athleteId=${athleteId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Erreur lors du chargement');
        return r.json() as Promise<ReasoningApiResponse>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de charger la synthèse physiologique.');
        setLoading(false);
      });
  }, [date, athleteId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
            <Brain className="text-primary h-4 w-4" />
            Raisonnement physiologique
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
            <Brain className="text-primary h-4 w-4" />
            Raisonnement physiologique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{error ?? 'Données indisponibles.'}</p>
        </CardContent>
      </Card>
    );
  }

  const config = VERDICT_CONFIG[data.overallVerdict];
  const topFinding = data.keyFindings[0] ?? null;
  const hasCritical = data.keyFindings.some((f) => f.severity === 'CRITICAL');
  const hasConflicts = data.conflicts.length > 0;

  return (
    <Card className={cn('border bg-gradient-to-b to-transparent', config.bg)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Brain className="text-primary h-4 w-4" />
            Raisonnement physiologique
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', config.dot)} />
            <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Top action */}
        {data.topAction && (
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              <span className={config.color}>{data.topAction.verb}</span>
              {' — '}
              {data.topAction.focus}
            </p>
            <p className="text-muted-foreground text-xs">{data.topAction.rationale}</p>
          </div>
        )}

        {/* Consistency row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">Cohérence inter-modèles</span>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'text-xs font-medium',
                CONSISTENCY_COLOR[data.physiologicalConsistency],
              )}
            >
              {CONSISTENCY_LABELS[data.physiologicalConsistency]}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {data.consistencyScore}/100
            </span>
          </div>
        </div>

        {/* Evidence graph */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Contribution par modèle
          </p>
          <EvidenceBar
            contribution={data.evidenceGraph.recoveryContribution}
            label={MODEL_LABELS.recovery}
          />
          <EvidenceBar
            contribution={data.evidenceGraph.fatigueContribution}
            label={MODEL_LABELS.fatigue}
          />
          <EvidenceBar
            contribution={data.evidenceGraph.adaptationContribution}
            label={MODEL_LABELS.adaptation}
          />
        </div>

        {/* Key finding */}
        {topFinding && (
          <div
            className={cn(
              'rounded-lg border px-3 py-2',
              topFinding.severity === 'CRITICAL'
                ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30'
                : topFinding.severity === 'WARNING'
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30'
                  : 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30',
            )}
          >
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  'mt-0.5 inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  SEVERITY_CONFIG[topFinding.severity].badge,
                )}
              >
                {topFinding.severity === 'CRITICAL'
                  ? 'CRITIQUE'
                  : topFinding.severity === 'WARNING'
                    ? 'ATTENTION'
                    : 'INFO'}
              </span>
              <div className="min-w-0">
                <p className="text-foreground text-xs font-medium">{topFinding.title}</p>
                {topFinding.evidence[0] && (
                  <p className="text-muted-foreground mt-0.5 text-xs">{topFinding.evidence[0]}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conflicts warning */}
        {hasConflicts && !hasCritical && (
          <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-900/50 dark:bg-orange-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
            <p className="text-xs text-orange-700 dark:text-orange-300">
              {data.conflicts[0].description}
            </p>
          </div>
        )}

        {/* Opportunity */}
        {data.opportunities.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Opportunité
            </p>
            <p className="text-foreground text-xs font-medium">{data.opportunities[0].title}</p>
            <p className="text-muted-foreground text-xs">{data.opportunities[0].rationale}</p>
          </div>
        )}

        {/* Limiting factor */}
        {data.limitingFactor.system && data.limitingFactor.description && (
          <p className="text-muted-foreground text-xs">
            Facteur limitant :{' '}
            <span className="text-foreground font-medium">{data.limitingFactor.description}</span>
          </p>
        )}

        {/* Low confidence notice */}
        {data.confidence < 0.5 && (
          <p className="text-muted-foreground text-xs italic">
            Confiance faible — plus de modèles actifs améliorent la précision.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
