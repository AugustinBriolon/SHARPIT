import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell } from 'lucide-react';
import { formatClockDuration } from '@/lib/format';
import type { ActivityDetail } from './types';

function formatStrengthSetDetail(set: ActivityDetail['strengthSets'][number]): string {
  if (set.durationSec && set.durationSec > 0 && !set.weightKg) {
    const perSet = formatClockDuration(set.durationSec);
    return set.sets > 1 ? `${set.sets} × ${perSet}` : perSet;
  }

  const base = `${set.sets}×${set.reps}`;
  return set.weightKg ? `${base} @ ${set.weightKg} kg` : base;
}

export function ActivityStrengthExercises({ activity }: { activity: ActivityDetail }) {
  const sets = activity.strengthSets;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
          <Dumbbell className="size-4 text-violet-600" />
          Exercices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sets.length > 0 ? (
          sets.map((set, i) => {
            const volume = set.sets * set.reps * (set.weightKg ?? 0);
            return (
              <div
                key={set.id}
                className="border-border/60 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-500/10 font-mono text-xs font-semibold text-violet-600">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 font-medium">
                  {set.exercise}
                  {set.notes && (
                    <span className="text-muted-foreground block truncate text-xs font-normal">
                      {set.notes}
                    </span>
                  )}
                </span>
                <span className="font-mono text-sm tabular-nums">
                  {formatStrengthSetDetail(set)}
                </span>
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  {volume > 0 && <span className="font-mono">{Math.round(volume)} kg</span>}
                  {set.rpe != null && (
                    <span className="border-border rounded-full border px-2 py-0.5 font-mono">
                      RPE {set.rpe}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucun exercice enregistré pour cette séance.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
