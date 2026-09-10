'use client';

import Link from 'next/link';
import { BookOpen, ChartLine } from 'lucide-react';
import type { TodayJournalHabitBridge } from '@/lib/health/journal-habit-today-bridge';

/**
 * Journal habit insight for Today.
 * Hierarchy: provenance → full sentence → soft claim → CTA.
 * Neutral plate (post-session twin) — not a Twin alert wash.
 */
export function TodayJournalHabitBridgeStrip({ bridge }: { bridge: TodayJournalHabitBridge }) {
  const { sourceLabel, meaning, disclaimer, confidenceNote, ctaLabel, href } = bridge;

  return (
    <Link
      className="border-analysis-border/80 bg-background/50 rounded-analysis group block cursor-pointer space-y-2 border px-3 py-3 transition-transform duration-150 ease-out active:scale-[0.985]"
      href={href}
    >
      <p className="text-muted-foreground flex items-center gap-1.5 text-[0.7rem] font-medium tracking-wide">
        <BookOpen className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
        {sourceLabel}
      </p>

      <p className="text-foreground text-sm leading-snug font-medium text-pretty">{meaning}</p>

      <p className="text-muted-foreground text-[0.7rem] leading-relaxed text-pretty">
        {disclaimer}
        {' · '}
        {confidenceNote}
      </p>

      <span className="text-primary inline-flex min-h-11 items-center gap-1.5 text-xs font-medium">
        <ChartLine className="size-3.5" strokeWidth={1.8} aria-hidden />
        {ctaLabel}
        <span
          className="transition-transform duration-150 ease-out group-hover:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      </span>
    </Link>
  );
}
