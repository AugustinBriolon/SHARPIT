'use client';

import { Check, Minus, CircleDashed } from 'lucide-react';
import type { JournalAutoChecklistItem } from '@/lib/journal/journal-auto-checklist';
import {
  JOURNAL_CATEGORY_HEADER,
  JOURNAL_CATEGORY_ICON,
} from '@/lib/journal/journal-category-surface';
import type { JournalNutritionSummary } from '@/lib/journal/journal-day-signals';
import { cn } from '@/lib/utils';

function StatusIcon({ status }: { status: JournalAutoChecklistItem['status'] }) {
  if (status === 'done') {
    return (
      <span className="bg-primary/15 text-primary inline-flex size-7 items-center justify-center rounded-lg">
        <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
      </span>
    );
  }
  if (status === 'missed') {
    return (
      <span className="bg-muted text-muted-foreground inline-flex size-7 items-center justify-center rounded-lg">
        <Minus className="size-3.5" strokeWidth={2} aria-hidden />
      </span>
    );
  }
  return (
    <span className="bg-muted/60 text-muted-foreground inline-flex size-7 items-center justify-center rounded-lg">
      <CircleDashed className="size-3.5" strokeWidth={1.8} aria-hidden />
    </span>
  );
}

export function JournalAutoChecklistSection({ items }: { items: JournalAutoChecklistItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="journal-auto-checklist"
      className="analysis-panel border-analysis-border/80 rounded-analysis overflow-hidden border"
    >
      <div
        className={cn(
          'border-analysis-border/60 border-b px-3 py-2.5',
          JOURNAL_CATEGORY_HEADER.automatique,
        )}
      >
        <h2 className="text-label" id="journal-auto-checklist">
          Checklist auto
        </h2>
        <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
          Dérivée de tes données santé et activités — lecture seule.
        </p>
      </div>
      <ul className="divide-analysis-border/60 divide-y">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-3">
            <StatusIcon status={item.status} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.label}</p>
              {item.detail ? (
                <p
                  className={cn(
                    'text-muted-foreground mt-0.5 text-xs tabular-nums',
                    item.status === 'unavailable' && 'italic',
                  )}
                >
                  {item.detail}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NutritionDietChips({ dietLabels }: { dietLabels: string[] }) {
  if (dietLabels.length === 0) {
    return null;
  }
  return (
    <div className="border-analysis-border/50 flex flex-wrap gap-1.5 border-b px-3 py-2.5">
      {dietLabels.map((label) => (
        <span
          key={label}
          className={cn(
            'rounded-md px-2 py-0.5 text-[11px] font-medium',
            JOURNAL_CATEGORY_ICON.nutrition,
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function NutritionMacros({ nutrition }: { nutrition: NonNullable<JournalNutritionSummary> }) {
  return (
    <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
      <MacroCell label="Calories" unit="kcal" value={`${Math.round(nutrition.calories)}`} />
      <MacroCell label="Protéines" unit="g" value={`${Math.round(nutrition.protein)}`} />
      <MacroCell label="Glucides" unit="g" value={`${Math.round(nutrition.carbohydrates)}`} />
      <MacroCell label="Lipides" unit="g" value={`${Math.round(nutrition.fat)}`} />
      {nutrition.sugar !== null ? (
        <MacroCell label="Sucres" unit="g" value={`${Math.round(nutrition.sugar)}`} />
      ) : null}
      <MacroCell label="Repas" unit="" value={`${nutrition.mealCount}`} />
    </div>
  );
}

export function JournalNutritionSection({
  nutrition,
  dietLabels,
}: {
  nutrition: JournalNutritionSummary;
  dietLabels: string[];
}) {
  return (
    <section
      aria-labelledby="journal-nutrition"
      className="analysis-panel border-analysis-border/80 rounded-analysis overflow-hidden border"
    >
      <div
        className={cn(
          'border-analysis-border/60 border-b px-3 py-2.5',
          JOURNAL_CATEGORY_HEADER.nutrition,
        )}
      >
        <h2 className="text-label" id="journal-nutrition">
          Nutrition
        </h2>
        <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
          Lecture de ton journal alimentaire synchronisé.
        </p>
      </div>
      <NutritionDietChips dietLabels={dietLabels} />
      {!nutrition ? (
        <p className="text-muted-foreground px-3 py-4 text-sm">Aucun log nutrition pour ce jour.</p>
      ) : (
        <NutritionMacros nutrition={nutrition} />
      )}
    </section>
  );
}

function MacroCell({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="border-analysis-border/40 px-3 py-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-data mt-1 text-sm tabular-nums">
        {value}
        {unit ? <span className="text-muted-foreground ml-1 text-xs">{unit}</span> : null}
      </p>
    </div>
  );
}
