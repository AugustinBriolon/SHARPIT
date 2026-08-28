'use client';

import type { EndurancePreviewStep } from '@/lib/planned-session/endurance/endurance-preview';
import { cn } from '@/lib/utils';

/**
 * The session as the watch will read it, one line per step.
 *
 * Shown before the push rather than after: the athlete decides whether to send
 * from what will actually be on the wrist, not from a promise about it. A step
 * with no band says "libre" — the warm-up and the recoveries carry none by
 * design (ADR-020), and a dash would read as missing data instead of intent.
 */
export function EnduranceStepList({ steps }: { steps: EndurancePreviewStep[] }) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <ul className="min-w-0 space-y-1.5">
      {steps.map((step) => (
        <li key={step.key} className="flex min-w-0 flex-col gap-0.5">
          {/* min-w-0 all the way down, or the fixed columns push the dialog wider
              than the viewport instead of letting the label shrink. */}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 text-sm sm:flex-nowrap">
            <span
              aria-hidden={step.repeat > 1 ? undefined : true}
              className={cn(
                'text-data w-5 shrink-0 text-right text-xs tabular-nums',
                step.repeat > 1 ? 'text-foreground/60' : 'text-transparent select-none',
              )}
            >
              {step.repeat > 1 ? `\u00d7${step.repeat}` : '\u00d71'}
            </span>

            {/* Narrow screens give the label its own row rather than truncating the stroke
                away; from sm up it rejoins the grid. text-label sets text-wrap: balance,
                which beats truncate's nowrap, hence the explicit override. */}
            <span className="text-label text-muted-foreground min-w-0 flex-1 basis-[calc(100%-1.875rem)] truncate [text-wrap:nowrap] sm:basis-auto">
              {step.kindLabel}
              {step.strokeLabel ? ` \u00b7 ${step.strokeLabel}` : ''}
            </span>

            {/* Own right-aligned row on mobile; `contents` from sm up so both columns
                rejoin the parent flex and line up across every step. */}
            <span className="flex w-full justify-end gap-x-2.5 sm:contents">
              <span className="text-data text-foreground w-14 shrink-0 text-right text-xs whitespace-nowrap tabular-nums">
                {step.durationLabel}
              </span>

              <span
                className={cn(
                  // Wide enough for the longest band the app produces, "1:52–2:12/100m".
                  'text-data w-[7.25rem] shrink-0 text-right text-xs whitespace-nowrap tabular-nums',
                  step.targetLabel ? 'text-foreground/85' : 'text-muted-foreground/50',
                )}
              >
                {step.targetLabel ?? 'libre'}
              </span>
            </span>
          </div>

          {step.notes ? (
            <p className="text-muted-foreground pl-[1.875rem] text-xs leading-snug">{step.notes}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
