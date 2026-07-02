'use client';

import { cn } from '@/lib/utils';
import { mapDeviationRisk, type DeviationRiskLevel } from '@/lib/today-mapping';
import type { Opportunity, Conflict, OverreachingRisk, FatigueTrajectory } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// OutcomeBlock — Q5: What happens if I follow? / Q6: What if I deviate?
// ─────────────────────────────────────────────────────────────────────────────

interface OutcomeBlockProps {
  opportunities: Opportunity[];
  conflicts: Conflict[];
  overreachingRisk: OverreachingRisk;
  functionalOverreachingRisk: OverreachingRisk;
  fatigueTrajectory: FatigueTrajectory;
}

const DEVIATION_STYLE: Record<DeviationRiskLevel, string> = {
  safe: '',
  caution: 'text-amber-600 dark:text-amber-400',
  warning: 'text-red-600 dark:text-red-400',
};

export function OutcomeBlock({
  opportunities,
  conflicts,
  overreachingRisk,
  functionalOverreachingRisk,
  fatigueTrajectory,
}: OutcomeBlockProps) {
  const [primary] = opportunities;
  const deviation = mapDeviationRisk(
    overreachingRisk,
    functionalOverreachingRisk,
    fatigueTrajectory,
  );

  const hasContent = primary || deviation.level !== 'safe' || conflicts.length > 0;
  if (!hasContent) return null;

  return (
    <div className="bg-card/60 space-y-4 rounded-2xl border px-5 py-5">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
        Expected outcomes
      </p>

      {/* Q5 — If you follow */}
      {primary && (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-emerald-500" aria-hidden>
            ✓
          </span>
          <div>
            <p className="text-sm font-medium">
              Follow this →{' '}
              <span className="text-muted-foreground font-normal">
                {primary.description ?? `+${Math.round(primary.expectedBenefit * 100)}% benefit`}
              </span>
            </p>
            {primary.timeWindow && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                Expected within {primary.timeWindow}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Q6 — If you deviate */}
      {deviation.level !== 'safe' && (
        <div className="flex items-start gap-3">
          <span className={cn('mt-0.5', DEVIATION_STYLE[deviation.level])} aria-hidden>
            ✗
          </span>
          <p className={cn('text-sm', DEVIATION_STYLE[deviation.level])}>{deviation.message}</p>
        </div>
      )}

      {/* Cross-model conflicts (if any) */}
      {conflicts.length > 0 && (
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Model conflicts
          </p>
          {conflicts.map((c, i) => (
            <div key={i} className="text-muted-foreground text-xs leading-relaxed">
              <span>{c.description}</span>
              {c.resolution && <span className="ml-1 italic">— {c.resolution}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
