'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Apple, Flame } from 'lucide-react';
import type { NutritionViewModel } from '@/core/presentation/nutrition-view-model';
import { cn } from '@/lib/utils';

async function fetchNutrition(): Promise<NutritionViewModel> {
  const res = await fetch('/api/presentation/nutrition');
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

function MiniMacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein + carbs + fat;
  if (total === 0) return null;
  const pPct = (protein / total) * 100;
  const cPct = (carbs / total) * 100;

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full">
      <div className="bg-primary" style={{ width: `${pPct}%` }} />
      <div className="bg-amber-400" style={{ width: `${cPct}%` }} />
      <div className="bg-signal-risk flex-1" />
    </div>
  );
}

export function TodayNutritionCard() {
  const { data } = useQuery({
    queryKey: ['presentation', 'nutrition'],
    queryFn: fetchNutrition,
    staleTime: 60_000,
  });

  if (!data?.connected || !data.today) return null;

  const { today } = data;

  return (
    <Link
      href="/nutrition"
      className={cn(
        'chip-surface group flex items-center gap-3 rounded-xl px-3.5 py-3',
        'hover:border-primary/25 transition-colors',
      )}
    >
      <div className="icon-well size-9 shrink-0" aria-hidden>
        <Apple className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline gap-2">
          <Flame className="text-primary size-3.5" />
          <span className="text-data text-sm font-semibold tabular-nums">{today.calories}</span>
          <span className="text-muted-foreground text-xs">kcal</span>
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">
            P {Math.round(today.protein)}g · G {Math.round(today.carbohydrates)}g · L{' '}
            {Math.round(today.fat)}g
          </span>
        </div>
        <MiniMacroBar carbs={today.carbohydrates} fat={today.fat} protein={today.protein} />
      </div>
      <span
        className="text-muted-foreground/70 text-data shrink-0 text-xs tracking-wider transition-transform group-hover:translate-x-0.5"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}
