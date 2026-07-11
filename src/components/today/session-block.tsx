'use client';

import Link from 'next/link';
import { CheckCircle2, CalendarClock } from 'lucide-react';
import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { cn } from '@/lib/utils';
import { resolve } from '@/lib/french';
import type { EngineRecommendation, KeyFinding } from '@/hooks/use-today';
import type { DaySummaryLine, TodayDaySummary } from '@/lib/today-day-summary';
import { MorningWellnessDialog } from './dashboard/morning-wellness-dialog';
import { PlannedSessionPrimary } from './dashboard/planned-session-primary';
import { TodayGoalsStrip } from './dashboard/today-goals-strip';

interface SessionBlockProps {
  recommendation: EngineRecommendation | null;
  daySummary: TodayDaySummary;
  keyFindings?: KeyFinding[];
  onWellnessCompleted?: () => void;
  className?: string;
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

function SessionLineContent({ line }: { line: DaySummaryLine }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="flex min-w-0 items-start gap-1.5">
        {line.kind === 'done' && (
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        )}
        {line.plannedSession ? (
          <PlannedSessionPrimary className="flex-1" session={line.plannedSession} />
        ) : (
          <>
            <ActivityTypeIndicator type={line.activityType} />
            <p className="line-clamp-2 min-w-0 text-sm leading-snug font-medium wrap-break-word">
              {line.primary}
            </p>
          </>
        )}
      </div>
      {line.secondary && (
        <p
          className={cn(
            'text-muted-foreground shrink-0 text-xs tabular-nums',
            line.kind === 'done' ? 'pl-5 sm:pl-0 sm:text-right' : 'sm:text-right',
          )}
        >
          {line.secondary}
        </p>
      )}
    </div>
  );
}

export function SessionBlock({
  recommendation,
  daySummary,
  keyFindings = [],
  onWellnessCompleted,
  className,
}: SessionBlockProps) {
  const whyLines = buildWhyLines(keyFindings, recommendation);

  return (
    <div
      className={cn('bg-card/60 space-y-4 rounded-2xl border px-4 py-4 sm:px-5 sm:py-5', className)}
    >
      <div className="flex min-h-6.5 items-start justify-between gap-2 sm:items-center sm:gap-3">
        <p className="text-muted-foreground min-w-0 flex-1 text-[11px] leading-snug font-medium uppercase">
          {daySummary.sectionLabel}
        </p>
        <div className="shrink-0">
          <MorningWellnessDialog onCompleted={onWellnessCompleted} />
        </div>
      </div>

      {daySummary.isEmpty ? (
        <div className="mt-2 space-y-2">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Aucune séance réalisée ni planifiée pour aujourd&apos;hui.
          </p>
          <Link
            className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
            href="/seances?tab=planning"
          >
            <CalendarClock className="size-3.5 shrink-0" />
            Ouvrir le planning
          </Link>
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {daySummary.lines.map((line) => {
            const rowClass = cn(
              'rounded-xl border px-3 py-2.5',
              line.kind === 'done'
                ? 'border-emerald-500/25 bg-emerald-500/5'
                : 'border-border/60 bg-background/40',
            );

            if (line.kind === 'done') {
              return (
                <li key={line.id}>
                  <Link
                    href={`/training/${line.id}`}
                    className={cn(
                      rowClass,
                      'block transition-colors hover:bg-emerald-500/10 active:opacity-80',
                    )}
                  >
                    <SessionLineContent line={line} />
                  </Link>
                </li>
              );
            }

            return (
              <li key={line.id} className={rowClass}>
                <SessionLineContent line={line} />
              </li>
            );
          })}
        </ul>
      )}

      <TodayGoalsStrip />

      {whyLines.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase">Pourquoi</p>
          <ul className="space-y-1.5">
            {whyLines.map((line, i) => (
              <li
                key={i}
                className={cn(
                  'text-xs leading-relaxed break-words',
                  i === 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
