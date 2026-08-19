'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Apple, Flame, Drumstick, Wheat, Droplets } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { NutritionViewModel } from '@/core/presentation/nutrition-view-model';
import { cn } from '@/lib/utils';

async function fetchNutrition(): Promise<NutritionViewModel> {
  const res = await fetch('/api/presentation/nutrition');
  if (!res.ok) throw new Error('Failed to load nutrition');
  return res.json();
}

function MacroRing({
  protein,
  carbs,
  fat,
  size = 96,
}: {
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
}) {
  const total = protein + carbs + fat;
  if (total === 0) return null;

  const protPct = protein / total;
  const carbsPct = carbs / total;

  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const protLen = protPct * circ;
  const carbsLen = carbsPct * circ;
  const fatLen = circ - protLen - carbsLen;

  return (
    <svg className="mx-auto -rotate-90" height={size} width={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={r}
        stroke="var(--color-signal-risk)"
        strokeDasharray={`${fatLen} ${circ - fatLen}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={r}
        stroke="var(--color-amber-400)"
        strokeDasharray={`${carbsLen} ${circ - carbsLen}`}
        strokeDashoffset={-fatLen}
        strokeLinecap="round"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={r}
        stroke="var(--color-primary)"
        strokeDasharray={`${protLen} ${circ - protLen}`}
        strokeDashoffset={-(fatLen + carbsLen)}
        strokeLinecap="round"
        strokeWidth={6}
      />
    </svg>
  );
}

function MacroLegend({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  const items = [
    {
      label: 'Protéines',
      grams: protein,
      color: 'bg-primary',
      pct: total > 0 ? Math.round(((protein * 4) / total) * 100) : 0,
    },
    {
      label: 'Glucides',
      grams: carbs,
      color: 'bg-amber-400',
      pct: total > 0 ? Math.round(((carbs * 4) / total) * 100) : 0,
    },
    {
      label: 'Lipides',
      grams: fat,
      color: 'bg-signal-risk',
      pct: total > 0 ? Math.round(((fat * 9) / total) * 100) : 0,
    },
  ];

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm">
          <span className={cn('size-2.5 shrink-0 rounded-full', item.color)} />
          <span className="text-muted-foreground flex-1">{item.label}</span>
          <span className="text-data font-medium tabular-nums">{Math.round(item.grams)}g</span>
          <span className="text-muted-foreground text-data w-8 text-right text-xs tabular-nums">
            {item.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}

function CalorieBar({ history }: { history: NutritionViewModel['history'] }) {
  if (history.length === 0) return null;
  const max = Math.max(...history.map((d) => d.calories), 1);

  return (
    <div className="flex items-end gap-1" style={{ height: 80 }}>
      {history
        .slice()
        .reverse()
        .map((d) => {
          const h = Math.max(4, (d.calories / max) * 80);
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="bg-primary/70 w-full rounded-t-sm"
                style={{ height: h }}
                title={`${d.date}: ${d.calories} kcal`}
              />
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {d.date.slice(8)}
              </span>
            </div>
          );
        })}
    </div>
  );
}

function NotConnectedState() {
  return (
    <div className="analysis-panel rounded-analysis-lg flex flex-col items-center gap-3 p-8 text-center">
      <Apple className="text-muted-foreground size-8" strokeWidth={1.5} />
      <div className="space-y-1">
        <p className="text-sm font-medium">Aucun provider nutrition connecté</p>
        <p className="text-muted-foreground text-sm">
          Connecte MyFitnessPal dans les réglages pour voir tes apports caloriques et macros.
        </p>
      </div>
      <Link
        className="bg-primary text-primary-foreground mt-2 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium"
        href="/settings/integrations"
      >
        Aller aux réglages
      </Link>
    </div>
  );
}

export function NutritionHub() {
  const { data, isLoading } = useQuery({
    queryKey: ['presentation', 'nutrition'],
    queryFn: fetchNutrition,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <StickyHeader>
        <p className="text-label">Nutrition</p>
        <h1 className="text-page-title mt-1">Apports & macros</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Journal alimentaire synchronisé depuis ton app de suivi.
        </p>
      </StickyHeader>

      {(() => {
        if (isLoading) {
          return (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-muted h-40 animate-pulse rounded-xl" />
              ))}
            </div>
          );
        }
        if (!data?.connected) {
          return <NotConnectedState />;
        }
        return (
          <div className="space-y-4">
            {data.today ? (
              <Card className="chip-surface rounded-analysis-lg shadow-none">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-label text-muted-foreground">Aujourd&apos;hui</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <Flame className="text-primary size-4" />
                        <span className="text-data text-2xl font-semibold tabular-nums">
                          {data.today.calories}
                        </span>
                        <span className="text-muted-foreground text-sm">kcal</span>
                      </div>
                    </div>
                    <MacroRing
                      carbs={data.today.carbohydrates}
                      fat={data.today.fat}
                      protein={data.today.protein}
                      size={72}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <MacroLegend
                    carbs={data.today.carbohydrates}
                    fat={data.today.fat}
                    protein={data.today.protein}
                  />
                  {data.today.meals.length > 0 && (
                    <div className="space-y-1.5 border-t pt-3">
                      <p className="text-label text-muted-foreground">Par repas</p>
                      {data.today.meals.map((meal, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-foreground/80">{meal.name}</span>
                          <span className="text-data text-muted-foreground tabular-nums">
                            {meal.calories} kcal
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="chip-surface rounded-analysis-lg shadow-none">
                <CardContent className="flex items-center gap-3 py-6">
                  <Apple className="text-muted-foreground size-5" />
                  <p className="text-muted-foreground text-sm">
                    Pas de données nutritionnelles pour aujourd&apos;hui.
                  </p>
                </CardContent>
              </Card>
            )}

            {data.history.length > 1 && (
              <Card className="chip-surface rounded-analysis-lg shadow-none">
                <CardHeader className="pb-2">
                  <p className="text-section-title">7 derniers jours</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <CalorieBar history={data.history} />
                  {data.averages && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-label text-muted-foreground">Moyenne quotidienne</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { icon: Flame, label: 'kcal', value: data.averages.calories },
                          { icon: Drumstick, label: 'Prot', value: `${data.averages.protein}g` },
                          { icon: Wheat, label: 'Gluc', value: `${data.averages.carbohydrates}g` },
                          { icon: Droplets, label: 'Lip', value: `${data.averages.fat}g` },
                        ].map((stat) => (
                          <div key={stat.label}>
                            <stat.icon className="text-muted-foreground mx-auto size-3.5" />
                            <p className="text-data mt-1 text-sm font-semibold tabular-nums">
                              {stat.value}
                            </p>
                            <p className="text-muted-foreground text-xs">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}
    </div>
  );
}
