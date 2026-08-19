import type { MacroKind } from '@/lib/nutrition/macro-colors';
import { MACRO_COLORS, MACRO_SHORT } from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

export function ColoredMacroPills({
  protein,
  carbs,
  fat,
  className,
}: {
  protein: number;
  carbs: number;
  fat: number;
  className?: string;
}) {
  const items: Array<{ kind: MacroKind; value: number }> = [
    { kind: 'protein', value: protein },
    { kind: 'carbs', value: carbs },
    { kind: 'fat', value: fat },
  ];

  return (
    <div className={cn('flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums', className)}>
      {items.map(({ kind, value }) => (
        <span key={kind} className={cn('inline-flex items-center gap-1', MACRO_COLORS[kind].text)}>
          <span className={cn('size-2 rounded-full', MACRO_COLORS[kind].dot)} aria-hidden />
          {MACRO_SHORT[kind]} {Math.round(value)} g
        </span>
      ))}
    </div>
  );
}

export function ColoredMacroStackBar({
  protein,
  carbs,
  fat,
  className,
}: {
  protein: number;
  carbs: number;
  fat: number;
  className?: string;
}) {
  const total = protein + carbs + fat;
  if (total === 0) return null;

  const segments: Array<{ kind: MacroKind; grams: number }> = [
    { kind: 'protein', grams: protein },
    { kind: 'carbs', grams: carbs },
    { kind: 'fat', grams: fat },
  ];

  return (
    <div
      className={cn('flex h-2 w-full overflow-hidden rounded-full', className)}
      role="presentation"
      aria-hidden
    >
      {segments.map(({ kind, grams }) => (
        <div
          key={kind}
          className={MACRO_COLORS[kind].bar}
          style={{ width: `${(grams / total) * 100}%` }}
        />
      ))}
    </div>
  );
}
