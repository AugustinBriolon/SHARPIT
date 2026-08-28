'use client';

import { Check, Loader2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StaggerList } from '@/components/motion/stagger-list';
import { ThresholdChangeRow } from '@/components/threshold/threshold-change-row';
import { useSafeMotion, useShouldAnimate } from '@/lib/motion/hooks';
import { motionTokens, springs } from '@/lib/motion/tokens';
import type { ThresholdApplyPreview, ThresholdField } from '@/lib/threshold/threshold-estimates';
import { cn } from '@/lib/utils';

function thresholdApplyLabel(
  applyLabel: string,
  acceptedCount: number,
  offeredCount: number,
): string {
  if (acceptedCount < offeredCount && acceptedCount > 0) {
    return `${applyLabel} (${acceptedCount})`;
  }
  return applyLabel;
}

function thresholdApplyWhileTap(
  animate: boolean,
  reduce: boolean | null,
  disabled: boolean,
  pending: boolean,
) {
  if (!animate || reduce || disabled || pending) {
    return undefined;
  }
  return { scale: motionTokens.scale.press };
}

function ThresholdSuggestionApplyRow({
  accepted,
  offeredCount,
  applyLabel,
  pending,
  disabled,
  animate,
  reduce,
  onApply,
  footer,
  size = 'sm',
}: {
  accepted: ThresholdField[];
  offeredCount: number;
  applyLabel: string;
  pending: boolean;
  disabled: boolean;
  animate: boolean;
  reduce: boolean | null;
  size?: 'default' | 'sm';
  onApply: (fields: ThresholdField[]) => void;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-0.5">
      <motion.div
        transition={springs.snappy}
        whileTap={thresholdApplyWhileTap(animate, reduce, disabled, pending)}
      >
        <Button
          disabled={disabled || pending || accepted.length === 0}
          size={size}
          type="button"
          onClick={() => onApply(accepted)}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="size-3.5" aria-hidden />
          )}
          {thresholdApplyLabel(applyLabel, accepted.length, offeredCount)}
        </Button>
      </motion.div>
      {accepted.length === 0 ? (
        <p className="text-muted-foreground text-xs">Aucune proposition retenue.</p>
      ) : null}
      {footer}
    </div>
  );
}

function ThresholdSuggestionCardBody({
  preview,
  pending,
  disabled,
  applyLabel,
  refused,
  onApply,
  onToggle,
  footer,
  compact,
  className,
}: {
  preview: ThresholdApplyPreview;
  pending: boolean;
  disabled: boolean;
  applyLabel: string;
  refused: ThresholdField[];
  onApply: (fields: ThresholdField[]) => void;
  onToggle: (field: ThresholdField) => void;
  footer?: React.ReactNode;
  compact: boolean;
  className?: string;
}) {
  const offered = preview.changes.map((change) => change.field);
  const accepted = offered.filter((field) => !refused.includes(field));
  const animate = useShouldAnimate({ essential: true });
  const reduce = useReducedMotion();

  return (
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
        {preview.changes.map((change) => (
          <ThresholdChangeRow
            key={change.field}
            change={change}
            disabled={disabled}
            isAccepted={!refused.includes(change.field)}
            pending={pending}
            onToggle={onToggle}
          />
        ))}
      </StaggerList>

      <ThresholdSuggestionApplyRow
        accepted={accepted}
        animate={animate}
        applyLabel={applyLabel}
        disabled={disabled}
        footer={footer}
        offeredCount={offered.length}
        pending={pending}
        reduce={reduce}
        size={compact ? 'default' : 'sm'}
        onApply={onApply}
      />
    </div>
  );
}

type ThresholdSuggestionCardProps = {
  preview: ThresholdApplyPreview;
  pending?: boolean;
  disabled?: boolean;
  applyLabel?: string;
  onApply: (fields: ThresholdField[]) => void;
  footer?: React.ReactNode;
  className?: string;
  compact?: boolean;
};

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
  const safe = useSafeMotion(motionTokens.distance.sm);

  const offered = useMemo(() => preview.changes.map((change) => change.field), [preview.changes]);
  const [refused, setRefused] = useState<ThresholdField[]>([]);
  useEffect(() => setRefused([]), [offered]);

  const toggle = (field: ThresholdField) =>
    setRefused((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );

  if (!preview.hasChanges) {
    return null;
  }

  const body = (
    <ThresholdSuggestionCardBody
      applyLabel={applyLabel}
      className={className}
      compact={compact}
      disabled={disabled}
      footer={footer}
      pending={pending}
      preview={preview}
      refused={refused}
      onApply={onApply}
      onToggle={toggle}
    />
  );

  if (!animate) {
    return body;
  }

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
