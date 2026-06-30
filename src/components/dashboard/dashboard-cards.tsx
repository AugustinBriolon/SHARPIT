'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AcwrZone, TrainingVerdict, TrendInfo } from '@/lib/dashboard';
import { accentForTone, type RecoveryTone } from '@/lib/recovery';
import { cn } from '@/lib/utils';
import { Gauge, Minus, TrendingDown, TrendingUp } from 'lucide-react';

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

const TREND_TONE: Record<TrendInfo['tone'], string> = {
  good: 'text-emerald-600',
  bad: 'text-red-600',
  neutral: 'text-muted-foreground',
};

// ---- Bannière verdict : la synthèse actionnable ----

export function VerdictBanner({ verdict }: { verdict: TrainingVerdict }) {
  return (
    <Card className={cn('bg-linear-to-br to-transparent', TONE_SURFACE[verdict.tone])}>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:gap-5">
        <span
          className={cn(
            'mt-1 grid size-11 shrink-0 place-items-center rounded-full',
            TONE_DOT[verdict.tone],
          )}
        >
          <Gauge className="size-5 text-white" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.2em] uppercase">
              Recommandation du jour
            </p>
          </div>
          <h2
            className={cn(
              'font-heading text-xl font-semibold tracking-tight',
              TONE_TEXT[verdict.tone],
            )}
          >
            {verdict.title}
          </h2>
          <p className="text-foreground/80 text-sm leading-relaxed">{verdict.message}</p>
          {verdict.cues.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {verdict.cues.map((cue) => (
                <span
                  key={cue}
                  className="border-border bg-card/60 text-muted-foreground rounded-full border px-2.5 py-1 text-xs font-medium"
                >
                  {cue}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Pilier générique (Disponibilité / Forme / Charge) ----

function PillarShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="min-h-44">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ReadinessPillar({
  score,
  levelLabel,
  recommendation,
  accent,
}: {
  score: number | null;
  levelLabel: string;
  recommendation: string;
  accent: string;
}) {
  const ringDeg = score != null ? (score / 100) * 360 : 0;
  return (
    <PillarShell label="Disponibilité">
      <div className="flex items-center gap-4">
        <div
          className="relative grid size-20 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${accent} ${ringDeg}deg, color-mix(in srgb, ${accent} 12%, transparent) ${ringDeg}deg)`,
          }}
        >
          <div className="bg-card grid size-[62px] place-items-center rounded-full">
            <span
              className="font-mono text-2xl font-semibold tabular-nums"
              style={{ color: accent }}
            >
              {score ?? '—'}
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: accent }}>
            {levelLabel}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{recommendation}</p>
        </div>
      </div>
    </PillarShell>
  );
}

export function FormPillar({
  tsb,
  label,
  tone,
  description,
  ctl,
  atl,
}: {
  tsb: number | null;
  label: string;
  tone: RecoveryTone;
  description: string;
  ctl: number;
  atl: number;
}) {
  return (
    <PillarShell label="Forme (TSB)">
      <div className="flex items-baseline gap-2">
        <span className={cn('font-mono text-4xl font-semibold tabular-nums', TONE_TEXT[tone])}>
          {tsb != null ? `${tsb > 0 ? '+' : ''}${tsb}` : '—'}
        </span>
        <span className={cn('text-sm font-medium', TONE_TEXT[tone])}>{label}</span>
      </div>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
      <div className="border-border/60 mt-3 grid grid-cols-2 gap-3 border-t pt-3">
        <div>
          <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
            Fitness · CTL
          </p>
          <p className="font-mono text-lg font-semibold tabular-nums">{ctl}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
            Fatigue · ATL
          </p>
          <p className="font-mono text-lg font-semibold tabular-nums">{atl}</p>
        </div>
      </div>
    </PillarShell>
  );
}

export function LoadPillar({
  weeklyLoad,
  acwr,
  zone,
}: {
  weeklyLoad: number;
  acwr: number;
  zone: AcwrZone;
}) {
  // Position du curseur ACWR sur l'échelle 0–2 (sweet spot 0.8–1.3).
  const pct = Math.max(0, Math.min(100, (acwr / 2) * 100));
  return (
    <PillarShell label="Charge 7 jours">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-4xl font-semibold tabular-nums">{weeklyLoad}</span>
        <span className="text-muted-foreground text-sm">TSS</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className={cn('size-2 rounded-full', TONE_DOT[zone.tone])} />
        <p className={cn('text-sm font-medium', TONE_TEXT[zone.tone])}>{zone.label}</p>
        <span className="text-muted-foreground text-xs">· ACWR {acwr}</span>
      </div>
      <div className="border-border/60 mt-3 border-t pt-3">
        <div className="bg-muted relative h-1.5 rounded-full">
          {/* zone optimale 0.8–1.3 sur l'échelle 0–2 */}
          <div className="absolute inset-y-0 right-[35%] left-[40%] rounded-full bg-emerald-500/25" />
          <div
            className="border-card absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{
              left: `${pct}%`,
              backgroundColor: accentForTone(zone.tone),
            }}
          />
        </div>
        <p className="text-muted-foreground mt-2 text-xs">{zone.hint}</p>
      </div>
    </PillarShell>
  );
}

// ---- Tuile bien-être quotidien ----

export function WellnessTile({
  label,
  value,
  sublabel,
  trend,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sublabel?: string;
  trend?: TrendInfo;
  tone?: RecoveryTone;
}) {
  const TrendIcon =
    trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', TONE_DOT[tone])} />
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {label}
          </p>
        </span>
        {trend && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium tabular-nums',
              TREND_TONE[trend.tone],
            )}
          >
            <TrendIcon className="size-3" />
            {trend.label}
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</p>
      {sublabel && <p className="text-muted-foreground mt-0.5 text-xs">{sublabel}</p>}
    </div>
  );
}
