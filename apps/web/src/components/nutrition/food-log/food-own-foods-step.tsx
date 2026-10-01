'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@sharpit/ui/components/ui/button';
import type { FoodProductPayload } from '@sharpit/app/lib/nutrition/food-log/food-log-day';

function OwnFoodRow({
  product,
  onPick,
  onEdit,
  onDelete,
}: {
  product: FoodProductPayload;
  onPick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-1">
      <button
        className="hover:bg-muted/50 focus-visible:ring-ring/50 flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left outline-none focus-visible:ring-3"
        type="button"
        onClick={onPick}
      >
        <span className="truncate text-sm leading-snug">{product.name}</span>
        <span className="text-muted-foreground text-data text-xs tabular-nums">
          {Math.round(product.kcalPer100g)} kcal / 100 g
        </span>
      </button>
      <Button
        aria-label={`Modifier ${product.name}`}
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={onEdit}
      >
        <Pencil className="size-4" aria-hidden />
      </Button>
      <Button
        aria-label={`Supprimer ${product.name}`}
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={onDelete}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </li>
  );
}

/** The athlete's own foods: pick one for the portion, edit it, or delete it. */
export function FoodOwnFoodsStep({
  foods,
  loading,
  error,
  onPick,
  onEdit,
  onDelete,
  onCreate,
}: {
  foods: FoodProductPayload[];
  loading: boolean;
  error: string | null;
  onPick: (product: FoodProductPayload) => void;
  onEdit: (product: FoodProductPayload) => void;
  onDelete: (product: FoodProductPayload) => void;
  onCreate: () => void;
}) {
  if (loading) {
    return <div className="bg-muted h-24 animate-pulse rounded-xl" aria-busy />;
  }
  return (
    <div className="space-y-4">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {foods.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Tu n’as pas encore d’aliment à toi. Crée-en un : il sera proposé dans tes recherches.
        </p>
      ) : (
        <ul className="divide-analysis-border/15 divide-y">
          {foods.map((product) => (
            <OwnFoodRow
              key={product.id}
              product={product}
              onDelete={() => onDelete(product)}
              onEdit={() => onEdit(product)}
              onPick={() => onPick(product)}
            />
          ))}
        </ul>
      )}
      <Button size="sm" type="button" variant="secondary" onClick={onCreate}>
        <Plus aria-hidden />
        Créer un aliment
      </Button>
    </div>
  );
}
