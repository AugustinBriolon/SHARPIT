'use client';

import { Plus, Repeat, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  newEnduranceDraftBlock,
  newEnduranceDraftStep,
  type EnduranceDraftBlock,
  type EnduranceDraftEffort,
  type EnduranceDraftMode,
  type EnduranceDraftStep,
  type EnduranceDraftStroke,
} from '@/lib/planned-session/endurance/endurance-draft';
import type {
  EnduranceSport,
  EnduranceStepKind,
} from '@/lib/planned-session/endurance/endurance-prescription';

const KIND_OPTIONS: { value: EnduranceStepKind; label: string }[] = [
  { value: 'warmup', label: 'Échauffement' },
  { value: 'interval', label: 'Bloc' },
  { value: 'recovery', label: 'Récup' },
  { value: 'rest', label: 'Repos' },
  { value: 'cooldown', label: 'Retour au calme' },
];

const MODE_OPTIONS: { value: EnduranceDraftMode; label: string }[] = [
  { value: 'time', label: 'Durée' },
  { value: 'distance', label: 'Distance' },
  { value: 'lap', label: 'Bouton Lap' },
];

const EFFORT_OPTIONS: { value: EnduranceDraftEffort; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'RECOVERY', label: 'Récupération' },
  { value: 'ENDURANCE', label: 'Endurance' },
  { value: 'TEMPO', label: 'Tempo' },
  { value: 'THRESHOLD', label: 'Seuil' },
  { value: 'VO2MAX', label: 'VO2max' },
];

const STROKE_OPTIONS: { value: EnduranceDraftStroke; label: string }[] = [
  { value: 'auto', label: 'Non précisée' },
  { value: 'free', label: 'Crawl' },
  { value: 'back', label: 'Dos' },
  { value: 'breast', label: 'Brasse' },
  { value: 'fly', label: 'Papillon' },
  { value: 'im', label: '4 nages' },
  { value: 'drill', label: 'Éducatif' },
  { value: 'mixed', label: 'Nage au choix' },
];

function labelOf<T extends string>(options: { value: T; label: string }[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

const UNIT_LABEL: Record<EnduranceDraftMode, string> = {
  time: 'min',
  distance: 'm',
  lap: '',
};

/** Switching unit must not reinterpret the number — 5 minutes is not 5 metres. */
const DEFAULT_VALUE: Record<EnduranceDraftMode, string> = {
  time: '5',
  distance: '1000',
  lap: '',
};

function fieldId(stepKey: string, field: string): string {
  return `endurance-${stepKey}-${field}`;
}

function StepRow({
  step,
  sport,
  onChange,
  onRemove,
  removable,
}: {
  step: EnduranceDraftStep;
  sport: EnduranceSport;
  onChange: (patch: Partial<EnduranceDraftStep>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const kindId = fieldId(step.key, 'kind');
  const modeId = fieldId(step.key, 'mode');
  const valueId = fieldId(step.key, 'value');
  const effortId = fieldId(step.key, 'effort');
  const strokeId = fieldId(step.key, 'stroke');

  return (
    <div className="border-analysis-border/50 space-y-2 rounded-md border p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label className="text-label" htmlFor={kindId}>
            Type
          </Label>
          <Select
            value={step.kind}
            onValueChange={(value) => onChange({ kind: value as EnduranceStepKind })}
          >
            <SelectTrigger id={kindId}>
              <SelectValue>{labelOf(KIND_OPTIONS, step.kind)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {removable ? (
          <Button
            aria-label="Supprimer l'étape"
            className="mt-5 shrink-0"
            size="icon"
            type="button"
            variant="ghost"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-label" htmlFor={modeId}>
            Fin
          </Label>
          <Select
            value={step.mode}
            onValueChange={(value) => {
              const mode = value as EnduranceDraftMode;
              onChange({ mode, value: mode === step.mode ? step.value : DEFAULT_VALUE[mode] });
            }}
          >
            <SelectTrigger id={modeId}>
              <SelectValue>{labelOf(MODE_OPTIONS, step.mode)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-label" htmlFor={valueId}>
            {step.mode === 'lap' ? 'Libre' : UNIT_LABEL[step.mode]}
          </Label>
          <Input
            disabled={step.mode === 'lap'}
            id={valueId}
            inputMode="decimal"
            placeholder={step.mode === 'distance' ? '1000' : '5'}
            value={step.mode === 'lap' ? '' : step.value}
            onChange={(event) => onChange({ value: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-label" htmlFor={effortId}>
          Intensité
        </Label>
        <Select
          value={step.effort}
          onValueChange={(value) => onChange({ effort: value as EnduranceDraftEffort })}
        >
          <SelectTrigger id={effortId}>
            <SelectValue>{labelOf(EFFORT_OPTIONS, step.effort)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {EFFORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sport === 'SWIM' ? (
        <div className="space-y-1">
          <Label className="text-label" htmlFor={strokeId}>
            Nage
          </Label>
          <Select
            value={step.stroke}
            onValueChange={(value) => onChange({ stroke: value as EnduranceDraftStroke })}
          >
            <SelectTrigger id={strokeId}>
              <SelectValue>{labelOf(STROKE_OPTIONS, step.stroke)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STROKE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <Input
        aria-label="Consigne de l'étape"
        placeholder="Consigne (facultatif)"
        value={step.notes}
        onChange={(event) => onChange({ notes: event.target.value })}
      />
    </div>
  );
}

/**
 * Swimming has no target table yet: the watch gets the set, not a pace band. Said
 * plainly here so the athlete does not expect guidance that will not come.
 */
const TARGET_HINT_BY_SPORT: Record<EnduranceSport, string> = {
  BIKE: 'Les fourchettes de puissance sont calculées depuis ta FTP au moment de l’envoi.',
  RUN: 'Les fourchettes d’allure sont calculées depuis ton allure seuil au moment de l’envoi.',
  SWIM: 'La montre affiche le déroulé série par série. Pas encore de cible d’allure en natation.',
};

/**
 * Editor for a structured endurance session: ordered blocks, each either a single
 * step or a repeated group. Targets are never typed here — the step's intensity is,
 * and the athlete's thresholds turn it into numbers at push time.
 */
export function EndurancePrescriptionEditor({
  blocks,
  sport,
  onChange,
}: {
  blocks: EnduranceDraftBlock[];
  sport: EnduranceSport;
  onChange: (blocks: EnduranceDraftBlock[]) => void;
}) {
  function updateBlock(key: string, patch: Partial<EnduranceDraftBlock>) {
    onChange(blocks.map((block) => (block.key === key ? { ...block, ...patch } : block)));
  }

  function updateStep(blockKey: string, stepKey: string, patch: Partial<EnduranceDraftStep>) {
    onChange(
      blocks.map((block) =>
        block.key === blockKey
          ? {
              ...block,
              steps: block.steps.map((step) =>
                step.key === stepKey ? { ...step, ...patch } : step,
              ),
            }
          : block,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm leading-none font-medium">Déroulé (montre)</p>
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onChange([...blocks, newEnduranceDraftBlock()])}
        >
          <Plus className="size-3.5" aria-hidden />
          Ajouter
        </Button>
      </div>

      {blocks.length === 0 ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Sans déroulé, la séance part à la montre en un bloc unique dérivé de la durée et de
          l&apos;intensité. Ajoute des étapes pour un fractionné guidé.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {TARGET_HINT_BY_SPORT[sport]}
        </p>
      )}

      {blocks.map((block, index) => {
        const timesId = `endurance-${block.key}-times`;
        return (
          <div
            key={block.key}
            className="border-analysis-border/60 bg-analysis-surface-alt/40 space-y-2 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Repeat className="text-muted-foreground size-3.5" aria-hidden />
                <Label className="text-label" htmlFor={timesId}>
                  Répétitions
                </Label>
                <Input
                  className="h-8 w-16"
                  id={timesId}
                  inputMode="numeric"
                  value={block.times}
                  onChange={(event) => updateBlock(block.key, { times: event.target.value })}
                />
              </div>
              <Button
                aria-label={`Supprimer le bloc ${index + 1}`}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => onChange(blocks.filter((b) => b.key !== block.key))}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </div>

            {block.steps.map((step) => (
              <StepRow
                key={step.key}
                removable={block.steps.length > 1}
                sport={sport}
                step={step}
                onChange={(patch) => updateStep(block.key, step.key, patch)}
                onRemove={() =>
                  updateBlock(block.key, {
                    steps: block.steps.filter((s) => s.key !== step.key),
                  })
                }
              />
            ))}

            <Button
              className="w-full"
              size="sm"
              type="button"
              variant="ghost"
              onClick={() =>
                updateBlock(block.key, { steps: [...block.steps, newEnduranceDraftStep()] })
              }
            >
              <Plus className="size-3.5" aria-hidden />
              Étape dans ce bloc
            </Button>
          </div>
        );
      })}
    </div>
  );
}
