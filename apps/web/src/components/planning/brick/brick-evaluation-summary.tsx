import { Button } from '@sharpit/ui/components/ui/button';
import type { ClientBrickEvaluation } from '@/hooks/use-data';
import { RPE_OPTIONS, TRANSITION_OPTIONS } from '@/components/ui/instruments/session-scales';

type EvaluationReading = { label: string; value: string };

function labelOf(options: readonly { value: number; label: string }[], value: number) {
  return options.find((option) => option.value === value)?.label ?? '';
}

/** Only the answers the athlete gave — an unanswered scale is not a zero. */
export function brickEvaluationReadings(
  evaluation: ClientBrickEvaluation | null,
): EvaluationReading[] {
  if (!evaluation) {
    return [];
  }
  const readings: EvaluationReading[] = [];
  if (evaluation.feeling) {
    readings.push({ label: 'Ressenti', value: evaluation.feeling });
  }
  if (evaluation.rpe !== null) {
    readings.push({
      label: 'RPE global',
      value: `${evaluation.rpe}/10 · ${labelOf(RPE_OPTIONS, evaluation.rpe)}`,
    });
  }
  if (evaluation.transitionRating !== null) {
    readings.push({
      label: 'Transitions',
      value: `${evaluation.transitionRating}/5 · ${labelOf(TRANSITION_OPTIONS, evaluation.transitionRating)}`,
    });
  }
  return readings;
}

export function BrickEvaluationSummary({
  evaluation,
  disabled,
  onEdit,
}: {
  evaluation: ClientBrickEvaluation | null;
  disabled: boolean;
  onEdit: () => void;
}) {
  const readings = brickEvaluationReadings(evaluation);
  const notes = evaluation?.notes?.trim();
  const isEmpty = readings.length === 0 && !notes;

  return (
    <div className="border-border/60 bg-background/60 space-y-2 rounded-md border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">Ton évaluation</p>
        <Button
          className="h-8 px-2 text-xs"
          disabled={disabled}
          size="sm"
          type="button"
          variant="ghost"
          onClick={onEdit}
        >
          {isEmpty ? 'Évaluer le brick' : 'Modifier'}
        </Button>
      </div>
      {isEmpty ? (
        <p className="text-muted-foreground text-xs">
          RPE global, transitions et ressenti sur l&apos;ensemble de l&apos;enchaînement.
        </p>
      ) : (
        <dl className="space-y-1 text-xs">
          {readings.map((reading) => (
            <div key={reading.label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{reading.label}</dt>
              <dd className="font-mono tabular-nums">{reading.value}</dd>
            </div>
          ))}
          {notes ? <p className="text-muted-foreground pt-1 whitespace-pre-line">{notes}</p> : null}
        </dl>
      )}
    </div>
  );
}
