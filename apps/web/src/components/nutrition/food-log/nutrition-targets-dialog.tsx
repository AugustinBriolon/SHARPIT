'use client';

import { Button } from '@sharpit/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FoodNumberField } from '@/components/nutrition/food-log/food-number-field';
import {
  TARGET_FIELDS,
  TARGET_SPLIT_FIELDS,
  targetFieldValue,
  type TargetSplitDraft,
  type TargetSplitReading,
} from '@/components/nutrition/food-log/food-log-forms';
import type { NutritionTargetsEditor } from '@/components/nutrition/food-log/use-nutrition-targets-editor';
import type { NutritionTargetsPayload } from '@sharpit/app/lib/nutrition/food-log/food-log-day';
import type { NutritionTargetMode } from '@sharpit/app/lib/nutrition/food-log/nutrition-targets';
import { cn } from '@sharpit/app/lib/utils';

const MODES: ReadonlyArray<{ mode: NutritionTargetMode; label: string }> = [
  { mode: 'GRAMS', label: 'Grammes' },
  { mode: 'PERCENT', label: '%' },
];

function TargetModeSwitch({
  mode,
  onMode,
}: {
  mode: NutritionTargetMode;
  onMode: (mode: NutritionTargetMode) => void;
}) {
  return (
    <div aria-label="Macros en" className="bg-muted inline-flex rounded-lg p-0.5" role="radiogroup">
      {MODES.map((option) => (
        <button
          key={option.mode}
          aria-checked={mode === option.mode}
          role="radio"
          type="button"
          className={cn(
            'rounded-md px-3 py-1 text-sm transition-colors',
            mode === option.mode ? 'bg-background shadow-sm' : 'text-muted-foreground',
          )}
          onClick={() => onMode(option.mode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function GramFields({ targets }: { targets: NutritionTargetsPayload | null }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TARGET_FIELDS.map((field) => (
        <FoodNumberField
          key={field.name}
          defaultValue={targetFieldValue(targets?.[field.name])}
          label={field.label}
          name={field.name}
          unit={field.unit}
        />
      ))}
    </div>
  );
}

function SplitFields({
  draft,
  reading,
  onDraft,
}: {
  draft: TargetSplitDraft;
  reading: TargetSplitReading;
  onDraft: (patch: Partial<TargetSplitDraft>) => void;
}) {
  return (
    <div className="space-y-3">
      <FoodNumberField
        label="Calories"
        name="kcal"
        unit="kcal"
        value={draft.kcal}
        required
        onChange={(kcal) => onDraft({ kcal })}
      />
      <div className="grid grid-cols-3 gap-3">
        {TARGET_SPLIT_FIELDS.map((field) => (
          <div key={field.name} className="space-y-1">
            <FoodNumberField
              label={field.label}
              name={field.name}
              unit="%"
              value={draft[field.name]}
              onChange={(value) => onDraft({ [field.name]: value })}
            />
            <p className="text-muted-foreground text-data text-xs tabular-nums">
              {reading.grams[field.name] === null ? '—' : `${reading.grams[field.name]} g`}
            </p>
          </div>
        ))}
      </div>
      <p
        aria-live="polite"
        className={cn(
          'text-sm tabular-nums',
          reading.balanced ? 'text-muted-foreground' : 'text-destructive',
        )}
      >
        Total : {reading.total} % {reading.balanced ? '' : '· il faut 100 %'}
      </p>
    </div>
  );
}

type TargetsFormEditor = Pick<
  NutritionTargetsEditor,
  'mode' | 'split' | 'reading' | 'error' | 'canSave' | 'setMode' | 'patchSplit' | 'save'
>;

export function NutritionTargetsForm({
  targets,
  editor,
}: {
  targets: NutritionTargetsPayload | null;
  editor: TargetsFormEditor;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        editor.save(new FormData(event.currentTarget));
      }}
    >
      <TargetModeSwitch mode={editor.mode} onMode={editor.setMode} />
      {editor.mode === 'PERCENT' ? (
        <SplitFields draft={editor.split} reading={editor.reading} onDraft={editor.patchSplit} />
      ) : (
        <GramFields targets={targets} />
      )}
      {editor.error ? <p className="text-destructive text-sm">{editor.error}</p> : null}
      <div className="flex justify-end">
        <Button disabled={!editor.canSave} type="submit" variant="highlight">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

/** The athlete's own daily targets: macros in grams, or as shares of the calories. */
export function NutritionTargetsDialog({
  targets,
  editor,
}: {
  targets: NutritionTargetsPayload | null;
  editor: NutritionTargetsEditor;
}) {
  return (
    <Dialog open={editor.open} onOpenChange={editor.setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Objectifs du jour</DialogTitle>
          <DialogDescription>
            {editor.mode === 'PERCENT'
              ? 'Répartis tes calories : les trois parts font 100 %.'
              : 'Laisse un champ vide pour ne pas suivre cet objectif.'}
          </DialogDescription>
        </DialogHeader>
        <NutritionTargetsForm
          key={editor.open ? 'open' : 'closed'}
          editor={editor}
          targets={targets}
        />
      </DialogContent>
    </Dialog>
  );
}
