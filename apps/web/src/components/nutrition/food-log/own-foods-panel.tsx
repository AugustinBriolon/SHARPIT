'use client';

import { NavArrowLeft } from '@/components/icons/nav-arrows';
import { Button } from '@sharpit/ui/components/ui/button';
import { FoodCustomStep } from '@/components/nutrition/food-log/food-custom-step';
import { FoodOwnFoodsStep } from '@/components/nutrition/food-log/food-own-foods-step';
import { useOwnFoodsPanel } from '@/components/nutrition/food-log/use-own-foods-panel';

/** The athlete's own foods, managed from Réglages (ADR-062). */
export function OwnFoodsPanel() {
  const panel = useOwnFoodsPanel();
  const editing = panel.mode.kind === 'edit' ? panel.mode.food : null;

  return (
    <section className="analysis-panel rounded-analysis-lg space-y-4 p-4 sm:p-5">
      {panel.mode.kind === 'list' ? (
        <FoodOwnFoodsStep
          error={panel.error}
          foods={panel.foods}
          loading={panel.loading}
          onCreate={() => panel.show({ kind: 'create' })}
          onDelete={panel.remove}
          onEdit={(food) => panel.show({ kind: 'edit', food })}
          onPick={(food) => panel.show({ kind: 'edit', food })}
        />
      ) : (
        <div className="space-y-3">
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => panel.show({ kind: 'list' })}
          >
            <NavArrowLeft className="size-4" aria-hidden />
            Mes aliments
          </Button>
          <FoodCustomStep
            key={editing?.id ?? 'new'}
            error={panel.error}
            food={editing}
            pending={panel.pending}
            onSubmit={panel.submit}
          />
        </div>
      )}
      {panel.confirmDialog}
    </section>
  );
}
