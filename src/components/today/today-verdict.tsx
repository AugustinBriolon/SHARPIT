'use client';

import type { TrainingVerdict } from '@/lib/dashboard';
import { acwrZone } from '@/lib/dashboard';
import type { RecoveryTone } from '@/lib/recovery';
import { accentForTone } from '@/lib/recovery';
import { cn } from '@/lib/utils';
import { ChevronDown, Gauge } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

const TONE_TEXT: Record<RecoveryTone, string> = {
  good: 'text-emerald-600',
  moderate: 'text-amber-600',
  low: 'text-red-600',
  neutral: 'text-muted-foreground',
};

const TONE_DOT: Record<RecoveryTone, string> = {
  good: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  low: 'bg-red-500',
  neutral: 'bg-muted-foreground',
};

const TONE_SURFACE: Record<RecoveryTone, string> = {
  good: 'border-emerald-500/30 from-emerald-500/10',
  moderate: 'border-amber-500/30 from-amber-500/10',
  low: 'border-red-500/30 from-red-500/10',
  neutral: 'border-border from-muted/40',
};

export interface TodayVerdictMetrics {
  readinessScore: number | null;
  readinessLabel: string;
  tsb: number | null;
  ctl: number;
  atl: number;
  acwr: number;
}

export function TodayVerdict({
  verdict,
  metrics,
}: {
  verdict: TrainingVerdict;
  metrics: TodayVerdictMetrics;
}) {
  const [open, setOpen] = useState(false);
  const zone = acwrZone(metrics.acwr);

  return (
    <Card className={cn('bg-linear-to-br to-transparent', TONE_SURFACE[verdict.tone])}>
      <CardContent className="py-5">
        <div className="flex gap-4">
          <span
            className={cn(
              'mt-0.5 grid size-11 shrink-0 place-items-center rounded-full',
              TONE_DOT[verdict.tone],
            )}
          >
            <Gauge className="size-5 text-white" />
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-muted-foreground text-[11px] font-medium tracking-[0.2em] uppercase">
                Verdict du jour
              </p>
              <h2
                className={cn(
                  'font-heading mt-1 text-xl font-semibold tracking-tight',
                  TONE_TEXT[verdict.tone],
                )}
              >
                {verdict.title}
              </h2>
              <p className="text-foreground/80 mt-2 text-sm leading-relaxed">{verdict.message}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {metrics.readinessScore != null && (
                <MetricChip
                  accent={accentForTone(verdict.tone)}
                  label="Readiness"
                  value={`${metrics.readinessScore}`}
                />
              )}
              {metrics.tsb != null && (
                <MetricChip
                  label="TSB"
                  tooltip="Training Stress Balance — différence CTL/ATL (fraîcheur)"
                  value={`${metrics.tsb > 0 ? '+' : ''}${metrics.tsb}`}
                />
              )}
              {metrics.acwr > 0 && (
                <MetricChip
                  label="ACWR"
                  tooltip="Acute:Chronic Workload Ratio — rapport charge aiguë / chronique"
                  value={`${metrics.acwr} · ${zone.label}`}
                />
              )}
            </div>

            <button
              aria-expanded={open}
              className="text-muted-foreground hover:text-foreground flex min-h-[44px] items-center gap-1 text-xs font-medium transition-colors"
              type="button"
              onClick={() => setOpen((v) => !v)}
            >
              <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
              {open ? 'Masquer le détail' : 'Voir le détail'}
            </button>

            {open && (
              <div className="border-border/60 bg-card/40 grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
                <DetailCell
                  label="Disponibilité"
                  value={
                    metrics.readinessScore != null
                      ? `${metrics.readinessScore}/100 · ${metrics.readinessLabel}`
                      : '—'
                  }
                />
                <DetailCell
                  label="Forme (CTL/ATL)"
                  value={`CTL ${metrics.ctl} · ATL ${metrics.atl}`}
                  sub={
                    metrics.tsb != null
                      ? `TSB ${metrics.tsb > 0 ? '+' : ''}${metrics.tsb}`
                      : undefined
                  }
                />
                <DetailCell label="Charge" sub={zone.hint} value={zone.label} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricChip({
  label,
  value,
  accent,
  tooltip,
}: {
  label: string;
  value: string;
  accent?: string;
  tooltip?: string;
}) {
  return (
    <span
      className="border-border bg-card/60 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      title={tooltip}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </span>
  );
}

function DetailCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
    </div>
  );
}
