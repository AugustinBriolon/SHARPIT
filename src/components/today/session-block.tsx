'use client';

import Link from 'next/link';
import { CheckCircle2, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  mapAdaptationDecisionToObjective,
  type AdaptationDecisionVerdict,
} from '@/lib/today-mapping';
import { resolve } from '@/lib/french';
import type { EngineRecommendation, KeyFinding } from '@/hooks/use-today';
import type { TodayDaySummary } from '@/lib/today-day-summary';

interface SessionBlockProps {
  adaptationVerdict: AdaptationDecisionVerdict | null;
  recommendation: EngineRecommendation | null;
  daySummary: TodayDaySummary;
  keyFindings?: KeyFinding[];
}

function buildWhyLines(
  keyFindings: KeyFinding[],
  recommendation: EngineRecommendation | null,
): string[] {
  const lines: string[] = [];

  const [primary] = keyFindings;
  if (primary) {
    lines.push(resolve(primary.title));
    for (const item of primary.evidenceItems.slice(0, 2)) {
      lines.push(resolve(item));
    }
  }

  if (lines.length === 0 && recommendation?.keyEvidence) {
    for (const item of recommendation.keyEvidence.slice(0, 3)) {
      const text = resolve(item);
      if (text && text !== item.code) lines.push(text);
    }
  }

  return lines;
}

export function SessionBlock({
  adaptationVerdict,
  recommendation,
  daySummary,
  keyFindings = [],
}: SessionBlockProps) {
  const objective = adaptationVerdict ? mapAdaptationDecisionToObjective(adaptationVerdict) : null;
  const whyLines = buildWhyLines(keyFindings, recommendation);

  return (
    <div className="bg-card/60 space-y-4 rounded-2xl border px-5 py-5">
      <div>
        <p className="text-muted-foreground text-[11px] font-medium uppercase">
          {daySummary.sectionLabel}
        </p>

        {daySummary.isEmpty ? (
          <div className="mt-2 space-y-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Aucune séance réalisée ni planifiée pour aujourd&apos;hui.
            </p>
            <Link
              className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
              href="/seances?tab=planning"
            >
              <CalendarClock className="size-3.5" />
              Ouvrir le planning
            </Link>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {daySummary.lines.map((line) => (
              <li
                key={line.id}
                className={cn(
                  'flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5',
                  line.kind === 'done'
                    ? 'border-emerald-500/25 bg-emerald-500/5'
                    : 'border-border/60 bg-background/40',
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {line.kind === 'done' && (
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <p className="text-sm leading-snug font-medium">{line.primary}</p>
                  </div>
                </div>
                {line.secondary && (
                  <p className="text-muted-foreground shrink-0 text-right text-xs">
                    {line.secondary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {objective && (
        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <p className="text-muted-foreground text-[11px] font-medium uppercase">Objectif</p>
          <span className="bg-muted text-foreground rounded-md px-2 py-0.5 text-xs font-medium">
            {objective}
          </span>
        </div>
      )}

      {whyLines.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase">Pourquoi</p>
          <ul className="space-y-1">
            {whyLines.map((line, i) => (
              <li
                key={i}
                className={cn(
                  'text-xs leading-relaxed',
                  i === 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                {i > 0 && <span className="mr-1.5">·</span>}
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
