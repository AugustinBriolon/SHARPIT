import { cn } from "@/lib/utils";
import {
  accentForTone,
  factorLabel,
  feedbackLabel,
  feedbackTone,
  type ReadinessFactor,
  type ReadinessView,
  type RecoveryTone,
} from "@/lib/recovery";

const TONE_TEXT: Record<RecoveryTone, string> = {
  good: "text-emerald-600",
  moderate: "text-amber-600",
  low: "text-red-600",
  neutral: "text-muted-foreground",
};

const TONE_DOT: Record<RecoveryTone, string> = {
  good: "bg-emerald-400",
  moderate: "bg-amber-400",
  low: "bg-red-400",
  neutral: "bg-muted-foreground",
};

export function ReadinessHero({
  view,
  factors,
}: {
  view: ReadinessView;
  factors: ReadinessFactor[];
}) {
  const score = view.score;
  const ringDeg = score != null ? (score / 100) * 360 : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-5">
          <div
            className="relative grid size-28 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(${view.accent} ${ringDeg}deg, color-mix(in srgb, ${view.accent} 12%, transparent) ${ringDeg}deg)`,
            }}
          >
            <div className="grid size-[88px] place-items-center rounded-full bg-card content-center">
              <span
                className="font-mono text-3xl font-semibold tabular-nums"
                style={{ color: view.accent }}
              >
                {score ?? "—"}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                / 100
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Forme du jour
            </p>
            <p
              className="mt-1 font-heading text-2xl font-semibold"
              style={{ color: view.accent }}
            >
              {view.levelLabel}
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground sm:max-w-md sm:border-l sm:border-border/60 sm:pl-6">
          {view.recommendation}
        </p>
      </div>

      {factors.length > 0 && (
        <div className="mt-6 border-t border-border/60 pt-5">
          <ReadinessFactorList factors={factors} />
        </div>
      )}
    </div>
  );
}

/** Détail des facteurs Garmin qui composent le score de forme. */
export function ReadinessFactorList({
  factors,
}: {
  factors: ReadinessFactor[];
}) {
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
        <span className={cn("font-medium", TONE_TEXT[tone])}>
          {feedbackLabel(factor.feedback)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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
  tone = "neutral",
  footer,
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: RecoveryTone;
  footer?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", TONE_DOT[tone])} />
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums",
          TONE_TEXT[tone],
        )}
      >
        {value}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-sm text-foreground/80">{sublabel}</p>
      )}
      {footer && (
        <p className="mt-1 text-xs text-muted-foreground">{footer}</p>
      )}
    </div>
  );
}
