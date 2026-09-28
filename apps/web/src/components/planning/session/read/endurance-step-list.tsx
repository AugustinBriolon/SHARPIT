'use client';

import {
  previewStepSets,
  type EndurancePreviewStep,
} from '@sharpit/app/lib/planned-session/endurance/endurance-preview';
import { cn } from '@sharpit/app/lib/utils';

/**
 * The session as the watch will read it, one line per step.
 *
 * Shown before the push rather than after: the athlete decides whether to send
 * from what will actually be on the wrist, not from a promise about it. A step
 * with no band says "libre" — the warm-up and the recoveries carry none by
 * design (ADR-020), and a dash would read as missing data instead of intent.
 *
 * A repeated set is bracketed under its count: a 5 × (bloc + récup) reads as the
 * block and its recovery done five times, not five blocks then five recoveries.
 */
export function EnduranceStepList({ steps }: { steps: EndurancePreviewStep[] }) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <ul className="min-w-0 space-y-1.5">
      {previewStepSets(steps).map((set) =>
        set.repeat > 1 ? (
          <li key={set.group} aria-label={`${set.repeat} fois`} className="flex min-w-0 gap-x-2.5">
            <span className="text-data text-foreground/60 w-5 shrink-0 pt-px text-right text-xs tabular-nums">
              {`×${set.repeat}`}
            </span>
            <ul className="border-foreground/20 min-w-0 flex-1 space-y-1.5 border-l pl-2.5">
              {set.steps.map((step) => (
                <li key={step.key}>
                  <EnduranceStepRow step={step} />
                </li>
              ))}
            </ul>
          </li>
        ) : (
          set.steps.map((step) => (
            <li key={step.key} className="pl-[1.875rem]">
              <EnduranceStepRow step={step} />
            </li>
          ))
        ),
      )}
    </ul>
  );
}

function EnduranceStepRow({ step }: { step: EndurancePreviewStep }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {/* min-w-0 all the way down, or the fixed columns push the dialog wider
          than the viewport instead of letting the label shrink. */}
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 text-sm sm:flex-nowrap">
        {/* Narrow screens give the label its own row rather than truncating the stroke
            away; from sm up it rejoins the grid. text-label sets text-wrap: balance,
            which beats truncate's nowrap, hence the explicit override. */}
        <span className="text-label text-muted-foreground min-w-0 flex-1 basis-full truncate [text-wrap:nowrap] sm:basis-auto">
          {step.kindLabel}
          {step.strokeLabel ? ` · ${step.strokeLabel}` : ''}
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
        <p className="text-muted-foreground text-xs leading-snug">{step.notes}</p>
      ) : null}
    </div>
  );
}
