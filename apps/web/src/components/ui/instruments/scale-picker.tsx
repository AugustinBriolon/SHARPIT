'use client';

import { useId, type KeyboardEvent } from 'react';
import { cn } from '@sharpit/server/lib/utils';

/**
 * One grammar for every subjective capture — morning wellness and session
 * feeling asked the same kind of question in two different visual languages
 * (numbered tiles on one, emoji faces on the other). Emoji faces are consumer
 * fitness DNA and decorative by definition (DESIGN_LANGUAGE §11.1), so the
 * ordinal carries the scale and the label carries the meaning.
 *
 * Options wrap five per row whatever the scale length: a 1-10 scale becomes two
 * rows of five rather than ten cells of ~30px, which would sit under the tap
 * minimum on a phone.
 */

export type ScaleOption<TValue extends string | number> = {
  readonly value: TValue;
  readonly label: string;
  /** Shown when this option is selected; falls back to the group hint. */
  readonly hint?: string;
};

/** Step progress in the dialog header — position, not achievement. */
export function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={cn(
            'h-1 rounded-full transition-all duration-200',
            index === current && 'bg-primary w-5',
            index < current && 'bg-primary/40 w-1.5',
            index > current && 'bg-border w-1.5',
          )}
        />
      ))}
    </div>
  );
}

/** Wraps at both ends so the arrow keys never dead-end. */
export function nextScaleValue<TValue extends string | number>(
  options: readonly ScaleOption<TValue>[],
  value: TValue | null,
  delta: number,
): TValue {
  const index = options.findIndex((option) => option.value === value);
  if (index < 0) {
    return (delta >= 0 ? options[0]! : options.at(-1)!).value;
  }
  return options[(index + delta + options.length) % options.length]!.value;
}

function ScaleOptionButton({
  ordinal,
  label,
  selected,
  focusable,
  onSelect,
}: {
  ordinal: number;
  label: string;
  selected: boolean;
  focusable: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-checked={selected}
      aria-label={`${ordinal} — ${label}`}
      role="radio"
      tabIndex={focusable ? 0 : -1}
      type="button"
      className={cn(
        'pressable flex min-h-14 cursor-pointer items-center justify-center rounded-xl border',
        'transition-[background-color,border-color,transform] duration-150',
        selected
          ? 'border-highlight bg-highlight text-highlight-foreground scale-105'
          : 'border-border/60 bg-background hover:border-primary/30 hover:bg-muted/40',
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          'text-data text-2xl leading-none font-semibold tabular-nums',
          selected ? 'text-highlight-foreground' : 'text-foreground/70',
        )}
        aria-hidden
      >
        {ordinal}
      </span>
    </button>
  );
}

function scaleKeyHandler<TValue extends string | number>(
  options: readonly ScaleOption<TValue>[],
  value: TValue | null,
  onChange: (value: TValue) => void,
) {
  return (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(nextScaleValue(options, value, 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(nextScaleValue(options, value, -1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onChange(options[0]!.value);
    } else if (event.key === 'End') {
      event.preventDefault();
      onChange(options.at(-1)!.value);
    }
  };
}

function ScaleHeader({
  title,
  reading,
  titleId,
  hintId,
}: {
  title: string;
  reading: string;
  titleId: string;
  hintId: string;
}) {
  return (
    <div className="text-center">
      <p className="text-section-title" id={titleId}>
        {title}
      </p>
      <p className="text-muted-foreground mt-1 min-h-5 text-sm text-pretty" id={hintId}>
        {reading}
      </p>
    </div>
  );
}

function ScaleOptions<TValue extends string | number>({
  options,
  value,
  onChange,
}: {
  options: readonly ScaleOption<TValue>[];
  value: TValue | null;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="grid w-full grid-cols-5 gap-2">
      {options.map((option, index) => (
        <ScaleOptionButton
          key={option.value}
          focusable={value === null ? index === 0 : option.value === value}
          label={option.label}
          ordinal={index + 1}
          selected={option.value === value}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}

/**
 * A titled radiogroup of ordinal tiles. The hint line is the instrument: it
 * carries the question until a choice is made, then reads back what that choice
 * means, so the athlete never has to decode a number alone.
 */
export function ScalePicker<TValue extends string | number>({
  title,
  hint,
  options,
  value,
  footnote,
  onChange,
}: {
  title: string;
  /** Shown until an option with its own hint is selected. */
  hint: string;
  options: readonly ScaleOption<TValue>[];
  value: TValue | null;
  footnote?: string;
  onChange: (value: TValue) => void;
}) {
  const titleId = useId();
  const hintId = useId();
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <div
      aria-describedby={hintId}
      aria-labelledby={titleId}
      className="flex flex-col items-center gap-5"
      role="radiogroup"
      onKeyDown={scaleKeyHandler(options, value, onChange)}
    >
      <ScaleHeader
        hintId={hintId}
        reading={selected?.hint ?? selected?.label ?? hint}
        title={title}
        titleId={titleId}
      />
      <ScaleOptions options={options} value={value} onChange={onChange} />
      {footnote ? (
        <p className="text-muted-foreground text-center text-xs text-pretty">{footnote}</p>
      ) : null}
    </div>
  );
}
