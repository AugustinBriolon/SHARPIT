import type { MacroKind } from '@/lib/nutrition/macro-colors';
import { MacroRingCell } from '@/components/today/dashboard/today-nutrition-card-parts';

type MacroGoals = {
  protein: { goal: number | null; pct: number | null };
  carbohydrates: { goal: number | null; pct: number | null };
  fat: { goal: number | null; pct: number | null };
} | null;

const MACRO_ROWS: Array<{
  kind: MacroKind;
  key: keyof NonNullable<MacroGoals>;
  dayKey: 'protein' | 'carbohydrates' | 'fat';
}> = [
  { kind: 'protein', key: 'protein', dayKey: 'protein' },
  { kind: 'carbs', key: 'carbohydrates', dayKey: 'carbohydrates' },
  { kind: 'fat', key: 'fat', dayKey: 'fat' },
];

export function NutritionMacroGrid({
  day,
  goals,
}: {
  day: { protein: number; carbohydrates: number; fat: number };
  goals: MacroGoals;
}) {
  return (
    <div className="border-border/50 grid grid-cols-3 gap-2 border-t pt-3.5">
      {MACRO_ROWS.map(({ kind, key, dayKey }) => (
        <MacroRingCell
          key={kind}
          goal={goals?.[key].goal ?? null}
          grams={day[dayKey]}
          kind={kind}
          pct={goals?.[key].pct ?? null}
        />
      ))}
    </div>
  );
}
