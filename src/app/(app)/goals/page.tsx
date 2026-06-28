import { GoalKind } from "@prisma/client";
import {
  GoalsToolbar,
  MetricGoalCard,
  RaceCard,
  type GoalItem,
} from "@/components/goals/goal-cards";
import { getGoals } from "@/lib/queries";
import { horizonLabels, horizonOrder } from "@/lib/goals";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = (await getGoals()) as unknown as GoalItem[];

  const races = goals
    .filter((g) => g.kind === GoalKind.RACE)
    .sort((a, b) => {
      const da = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
      const db = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
      return da - db;
    });

  const metrics = goals.filter((g) => g.kind === GoalKind.METRIC);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Goals
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
            Objectifs
          </h1>
          <p className="mt-1 text-muted-foreground">
            Des courses aux objectifs hebdomadaires — toute la hiérarchie.
          </p>
        </div>
        <GoalsToolbar />
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Courses à venir
        </h2>
        {races.length ? (
          <div className="space-y-3">
            {races.map((race) => (
              <RaceCard key={race.id} goal={race} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground">
            Aucune course planifiée.
          </p>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Objectifs chiffrés
        </h2>
        {metrics.length ? (
          horizonOrder.map((horizon) => {
            const group = metrics.filter((g) => g.horizon === horizon);
            if (!group.length) return null;
            return (
              <div key={horizon} className="space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-wider text-primary/80">
                  {horizonLabels[horizon]}
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.map((goal) => (
                    <MetricGoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground">
            Aucun objectif chiffré. Crée-en un pour suivre ta progression.
          </p>
        )}
      </section>
    </div>
  );
}
