import { cn } from '@/lib/utils';
import { ArcGauge } from '@/components/ui/arc-gauge';
import { CorpsPanel, CorpsStatCard } from '@/components/corps/corps-ui';
import {
  accentForTone,
  factorLabel,
  feedbackLabel,
  feedbackTone,
  type ReadinessFactor,
  type ReadinessView,
  type RecoveryTone,
  recoveryToneToCorpsTone,
} from '@/lib/recovery';

const TONE_TEXT: Record<RecoveryTone, string> = {
  good: 'text-primary',
  moderate: 'text-signal-caution',
  low: 'text-signal-risk',
  neutral: 'text-muted-foreground',
};

export function ReadinessHero({
  view,
  factors,
}: {
  view: ReadinessView;
  factors: ReadinessFactor[];
}) {
  const { score } = view;

  return (
    <CorpsPanel className="p-5">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-5">
          <ArcGauge
            format="number"
            score={score}
            size={112}
            strokeColor={view.accent}
            strokeWidth={6}
          >
            <span className="flex flex-col items-center leading-none">
              <span
                className="font-mono text-3xl font-semibold tabular-nums"
                style={{ color: view.accent }}
              >
                {score ?? '—'}
              </span>
              <span className="text-muted-foreground mt-1 text-[10px] tracking-wider uppercase">
                / 100
              </span>
            </span>
          </ArcGauge>
          <div>
            <p className="text-label">Forme du jour</p>
            <p className="text-verdict mt-1" style={{ color: view.accent }}>
              {view.levelLabel}
            </p>
          </div>
        </div>

        <p className="text-muted-foreground sm:border-border/60 text-sm leading-relaxed sm:max-w-md sm:border-l sm:pl-6">
          {view.recommendation}
        </p>
      </div>

      {factors.length > 0 && (
        <div className="border-border/50 mt-6 border-t pt-5">
          <ReadinessFactorList factors={factors} />
        </div>
      )}
    </CorpsPanel>
  );
}
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
    <CorpsStatCard
      footer={footer}
      label={label}
      sublabel={sublabel}
      tone={recoveryToneToCorpsTone(tone)}
      value={value}
    />
  );
}
