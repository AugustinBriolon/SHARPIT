'use client';

import { Check, Loader2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { StaggerItem, StaggerList } from '@/components/motion/stagger-list';
import { useSafeMotion, useShouldAnimate } from '@/lib/motion/hooks';
import { motionTokens, springs } from '@/lib/motion/tokens';
import type {
  ThresholdApplyPreview,
  ThresholdChangeDirection,
  ThresholdField,
} from '@/lib/threshold/threshold-estimates';
import { cn } from '@/lib/utils';

const DIRECTION_META: Record<
  ThresholdChangeDirection,
  { label: string; Icon: typeof TrendingUp; className: string }
> = {
  up: {
    label: 'Hausse',
    Icon: TrendingUp,
    className: 'text-chart-4 bg-chart-4/10',
  },
  down: {
    label: 'Baisse',
    Icon: TrendingDown,
    className: 'text-chart-3 bg-chart-3/10',
  },
  set: {
    label: 'Nouveau',
    Icon: Minus,
    className: 'text-muted-foreground bg-muted/60',
  },
};

type ThresholdSuggestionCardProps = {
  preview: ThresholdApplyPreview;
  pending?: boolean;
  disabled?: boolean;
  applyLabel?: string;
  /** Receives only the revisions the athlete kept ticked. */
  onApply: (fields: ThresholdField[]) => void;
  footer?: React.ReactNode;
  className?: string;
  /** Compact layout for the calibration panel. */
  compact?: boolean;
};

/**
 * Human-in-the-loop threshold revision card.
 * Quiet enter (fade + rise), staggered rows, press feedback — instrument feel,
 * not celebration (DESIGN_LANGUAGE §3.3 / Beautiful UI recommendation card).
 */
export function ThresholdSuggestionCard({
  preview,
  pending = false,
  disabled = false,
  applyLabel = 'Appliquer',
  onApply,
  footer,
  className,
  compact = false,
}: ThresholdSuggestionCardProps) {
  const animate = useShouldAnimate({ essential: true });
  const reduce = useReducedMotion();
  const safe = useSafeMotion(motionTokens.distance.sm);

  const offered = useMemo(() => preview.changes.map((change) => change.field), [preview.changes]);
  // Proposals start accepted: the common case is taking them all, and a revision
  // the athlete disagrees with is the one worth an explicit gesture.
  const [refused, setRefused] = useState<ThresholdField[]>([]);
  useEffect(() => setRefused([]), [offered]);

  const accepted = offered.filter((field) => !refused.includes(field));
  const toggle = (field: ThresholdField) =>
    setRefused((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );

  if (!preview.hasChanges) return null;

  const body = (
    <div
      className={cn(
        'analysis-panel rounded-analysis-lg border-analysis-border/70 space-y-3 border',
        compact ? 'px-3 py-2.5' : 'p-4',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium tracking-tight">Proposition depuis tes records</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Capacité démontrée sur {preview.estimates.windowDays} jours — pas le PR lifetime.
          </p>
        </div>
      </div>

      <StaggerList className="space-y-1.5">
        {preview.changes.map((change) => {
          const meta = DIRECTION_META[change.direction];
          const { Icon } = meta;
          const isAccepted = !refused.includes(change.field);
          return (
            <StaggerItem key={change.field}>
              <div
                className={cn(
                  'bg-muted/25 rounded-analysis flex items-center gap-3 px-2.5 py-2',
                  'border-analysis-border/40 border transition-opacity',
                  !isAccepted && 'opacity-50',
                )}
              >
                <Checkbox
                  aria-label={`Appliquer ${change.label}`}
                  checked={isAccepted}
                  disabled={disabled || pending}
                  onCheckedChange={() => toggle(change.field)}
                />
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase',
                    meta.className,
                  )}
                >
                  <Icon className="size-3" aria-hidden />
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                    {change.label}
                  </p>
                  <p className="text-data text-sm tabular-nums">
                    <span className="text-muted-foreground">{change.from}</span>
                    <span className="text-muted-foreground mx-1.5">→</span>
                    <span className="text-foreground font-semibold">{change.to}</span>
                  </p>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerList>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <motion.div
          transition={springs.snappy}
          whileTap={
            animate && !reduce && !disabled && !pending
              ? { scale: motionTokens.scale.press }
              : undefined
          }
        >
          <Button
            disabled={disabled || pending || accepted.length === 0}
            size={compact ? 'default' : 'sm'}
            type="button"
            onClick={() => onApply(accepted)}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="size-3.5" aria-hidden />
            )}
            {accepted.length < offered.length && accepted.length > 0
              ? `${applyLabel} (${accepted.length})`
              : applyLabel}
          </Button>
        </motion.div>
        {accepted.length === 0 ? (
          <p className="text-muted-foreground text-xs">Aucune proposition retenue.</p>
        ) : null}
        {footer}
      </div>
    </div>
  );

  if (!animate) return body;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key="threshold-suggestion"
        animate={safe.animate}
        exit={safe.exit}
        initial={safe.initial}
        transition={{
          duration: motionTokens.duration.normal,
          ease: motionTokens.easing.smooth,
        }}
      >
        {body}
      </motion.div>
    </AnimatePresence>
  );
}
