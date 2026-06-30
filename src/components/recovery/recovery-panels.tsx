import { cn } from '@/lib/utils';
import {
  accentForTone,
  factorLabel,
  feedbackLabel,
  feedbackTone,
  type ReadinessFactor,
  type ReadinessView,
  type RecoveryTone,
} from '@/lib/recovery';

const TONE_TEXT: Record<RecoveryTone, string> = {
  good: 'text-emerald-600',
  moderate: 'text-amber-600',
  low: 'text-red-600',
  neutral: 'text-muted-foreground',
};

const TONE_DOT: Record<RecoveryTone, string> = {
  good: 'bg-emerald-400',
  moderate: 'bg-amber-400',
  low: 'bg-red-400',
  neutral: 'bg-muted-foreground',
};

export function ReadinessHero({
  view,
  factors,
}: {
  view: ReadinessView;
  factors: ReadinessFactor[];
}) {
  const { score } = view;
  const ringDeg = score != null ? (score / 100) * 360 : 0;

  return (
    <div className="border-border bg-card rounded-2xl border p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-5">
          <div
            className="relative grid size-28 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(${view.accent} ${ringDeg}deg, color-mix(in srgb, ${view.accent} 12%, transparent) ${ringDeg}deg)`,
            }}
          >
            <div className="bg-card grid size-[88px] place-items-center content-center rounded-full">
              <span
                className="font-mono text-3xl font-semibold tabular-nums"
                style={{ color: view.accent }}
              >
                {score ?? '—'}
              </span>
              <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                / 100
              </span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
              Forme du jour
            </p>
            <p className="font-heading mt-1 text-2xl font-semibold" style={{ color: view.accent }}>
              {view.levelLabel}
            </p>
          </div>
        </div>

        <p className="text-muted-foreground sm:border-border/60 text-sm leading-relaxed sm:max-w-md sm:border-l sm:pl-6">
          {view.recommendation}
        </p>
      </div>

      {factors.length > 0 && (
        <div className="border-border/60 mt-6 border-t pt-5">
          <ReadinessFactorList factors={factors} />
        </div>
      )}
    </div>
  );
}

/** Détail des facteurs Garmin qui composent le score de forme. */
export function ReadinessFactorList({ factors }: { factors: ReadinessFactor[] }) {
  if (factors.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {factors.map((f) => (
        <FactorRow key={f.key} factor={f} />
      ))}
    </div>
  );
}

function FactorRow({ factor }: { factor: ReadinessFactor }) {
  const tone = feedbackTone(factor.feedback);
  const pct = factor.percent ?? 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{factorLabel(factor.key)}</span>
        <span className={cn('font-medium', TONE_TEXT[tone])}>{feedbackLabel(factor.feedback)}</span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            backgroundColor: accentForTone(tone),
          }}
        />
      </div>
    </div>
  );
}

export function RecoveryStat({
  label,
  value,
  sublabel,
  tone = 'neutral',
  footer,
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: RecoveryTone;
  footer?: string;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <span className={cn('size-2 rounded-full', TONE_DOT[tone])} />
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {label}
        </p>
      </div>
      <p className={cn('mt-2 font-mono text-2xl font-semibold tabular-nums', TONE_TEXT[tone])}>
        {value}
      </p>
      {sublabel && <p className="text-foreground/80 mt-0.5 text-sm">{sublabel}</p>}
      {footer && <p className="text-muted-foreground mt-1 text-xs">{footer}</p>}
    </div>
  );
}
