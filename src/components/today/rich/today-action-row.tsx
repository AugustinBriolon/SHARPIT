'use client';

import Link from 'next/link';
import { CalendarClock, CheckCircle2 } from 'lucide-react';
import { formatLimitingFactorMessage } from '@/lib/athlete-state/snapshot-truthfulness';
import type { TodayDashboardViewModel } from '@/components/today/dashboard/use-today-dashboard-view-model';
import { resolveLimitingFactorHref, TWIN_DRILL_DOWN } from '@/lib/today-twin-navigation';
import { MorningWellnessDialog } from '@/components/today/dashboard/morning-wellness-dialog';
import { PlannedSessionPrimary } from '@/components/today/dashboard/planned-session-primary';
import type { DaySummaryLine } from '@/lib/today-day-summary';
import { actionRowLabels } from '@/lib/today-rich-view';
import { pickAdaptationReminders } from '@/lib/daily-phase/narrative';
import { cn } from '@/lib/utils';

function SessionLine({ line }: { line: DaySummaryLine }) {
  const content = (
    <div className="flex min-w-0 items-start gap-1.5">
      {line.kind === 'done' && (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      )}
      {line.plannedSession ? (
        <PlannedSessionPrimary className="flex-1" session={line.plannedSession} />
      ) : (
        <p className="line-clamp-2 min-w-0 text-sm leading-snug font-medium">{line.primary}</p>
      )}
      {line.secondary ? (
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {line.secondary}
        </span>
      ) : null}
    </div>
  );

  if (line.kind === 'done') {
    return (
      <Link
        className="block rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5 transition-colors hover:bg-emerald-500/10"
        href={TWIN_DRILL_DOWN.activity(line.id)}
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      className="border-border/60 bg-background/40 hover:bg-muted/40 block rounded-xl border px-3 py-2.5 transition-colors"
      href={TWIN_DRILL_DOWN.planning}
    >
      {content}
    </Link>
  );
}

function LimitingFactorBlock({ text, href }: { text: string; href: string | null }) {
  if (href) {
    return (
      <Link
        className="text-foreground block text-sm leading-relaxed underline-offset-2 transition-colors hover:underline"
        href={href}
      >
        {text}
      </Link>
    );
  }
  return <p className="text-foreground text-sm leading-relaxed">{text}</p>;
}

function LimitingSectionContent({
  phase,
  adaptationHints,
  limitingText,
  limitingHref,
  adaptationLimitingFactor,
}: {
  phase: string;
  adaptationHints: string[];
  limitingText: string | null;
  limitingHref: string | null;
  adaptationLimitingFactor: string | null | undefined;
}) {
  if (phase === 'RECOVERY_WINDOW' && adaptationHints.length > 0) {
    return (
      <ul className="text-foreground space-y-1.5 text-sm leading-relaxed">
        {adaptationHints.map((hint) => (
          <li key={hint}>· {hint}</li>
        ))}
      </ul>
    );
  }
  if (limitingText) {
    return <LimitingFactorBlock href={limitingHref} text={limitingText} />;
  }
  if (adaptationLimitingFactor) {
    return (
      <LimitingFactorBlock href={TWIN_DRILL_DOWN.adaptation} text={adaptationLimitingFactor} />
    );
  }
  return (
    <p className="text-muted-foreground text-sm leading-relaxed">
      Aucun frein physiologique majeur identifié aujourd&apos;hui.
    </p>
  );
}

export function TodayActionRow({
  vm,
  onWellnessCompleted,
}: {
  vm: TodayDashboardViewModel;
  onWellnessCompleted?: () => void;
}) {
  const limitingText = vm.limitingFactor ? formatLimitingFactorMessage(vm.limitingFactor) : null;
  const limitingHref = resolveLimitingFactorHref(vm.limitingFactor);
  const { daySummary } = vm;
  const phase = vm.dailyPhase?.phase ?? 'MORNING';
  const labels = actionRowLabels(phase);
  const adaptationHints = pickAdaptationReminders(phase, 3);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <section className="bg-card flex flex-col rounded-2xl border px-5 py-4 sm:px-6">
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-[0.14em] uppercase">
          {labels.limiting}
        </p>
        <LimitingSectionContent
          adaptationHints={adaptationHints}
          adaptationLimitingFactor={vm.adaptation?.limitingFactor}
          limitingHref={limitingHref}
          limitingText={limitingText}
          phase={phase}
        />
      </section>

      <section className="bg-card flex flex-col rounded-2xl border px-5 py-4 sm:px-6">
        <div className="mb-3 flex items-start justify-between gap-2">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
            {labels.action}
          </p>
          <MorningWellnessDialog onCompleted={onWellnessCompleted} />
        </div>

        {daySummary.isEmpty ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Aucune séance prévue ni réalisée.</p>
            <Link
              className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
              href={TWIN_DRILL_DOWN.planning}
            >
              <CalendarClock className="size-3.5" />
              Voir le planning
            </Link>
          </div>
        ) : (
          <ul className={cn('space-y-2')}>
            {daySummary.lines.map((line) => (
              <li key={line.id}>
                <SessionLine line={line} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
