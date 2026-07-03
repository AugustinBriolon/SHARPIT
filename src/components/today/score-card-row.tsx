'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  mapScoreToColorClass,
  mapRecoveryToSignal,
  mapFatigueToSignal,
  type ReadinessCategory,
  type FatigueLevel,
  type FatigueTrajectory,
} from '@/lib/today-mapping';

// ─────────────────────────────────────────────────────────────────────────────
// ScoreCardRow — three clickable health score cards at the top of Today
// ─────────────────────────────────────────────────────────────────────────────

interface ScoreCardRowProps {
  recoveryScore: number | null;
  recoveryCategory: ReadinessCategory;
  effortScore: number | null;
  fatigueLevel: FatigueLevel;
  fatigueTrajectory: FatigueTrajectory;
  sleepScore: number | null;
  sleepAdequacy: string;
}

function ScoreCard({
  href,
  label,
  score,
  trendLabel,
  trendArrow,
  trendClass,
}: {
  href: string;
  label: string;
  score: number | null;
  trendLabel: string;
  trendArrow: string;
  trendClass: string;
}) {
  const scoreClass = mapScoreToColorClass(score);
  return (
    <Link
      className="bg-card/60 hover:bg-card/80 flex flex-col gap-1 rounded-2xl border px-4 py-4 transition-colors"
      href={href}
    >
      <p className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
        {label}
      </p>
      <p className={cn('text-3xl leading-none font-bold tabular-nums', scoreClass)}>
        {score !== null ? score : '—'}
      </p>
      <span className={cn('flex items-center gap-1 text-xs font-medium', trendClass)}>
        {trendLabel}
        <span className="text-[10px]" aria-hidden>
          {trendArrow}
        </span>
      </span>
    </Link>
  );
}

const SLEEP_ADEQUACY_LABEL: Record<string, { label: string; arrow: string; colorClass: string }> = {
  EXCELLENT: {
    label: 'Excellent',
    arrow: '↗',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
  },
  ADEQUATE: { label: 'Correct', arrow: '→', colorClass: 'text-blue-600 dark:text-blue-400' },
  INSUFFICIENT: {
    label: 'Insuffisant',
    arrow: '↘',
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  SEVERELY_INSUFFICIENT: {
    label: 'Insuffisant',
    arrow: '↓',
    colorClass: 'text-red-600 dark:text-red-400',
  },
};

export function ScoreCardRow({
  recoveryScore,
  recoveryCategory,
  effortScore,
  fatigueLevel,
  fatigueTrajectory,
  sleepScore,
  sleepAdequacy,
}: ScoreCardRowProps) {
  const recoverySignal = mapRecoveryToSignal(recoveryCategory);
  const fatigueSignal = mapFatigueToSignal(fatigueLevel, fatigueTrajectory);
  const sleepDisplay = SLEEP_ADEQUACY_LABEL[sleepAdequacy] ?? {
    label: sleepAdequacy || '—',
    arrow: '→',
    colorClass: 'text-muted-foreground',
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <ScoreCard
        href="/today/recovery"
        label="Récup"
        score={recoveryScore}
        trendArrow={recoverySignal.arrow}
        trendClass={recoverySignal.qualityClass}
        trendLabel={recoverySignal.label}
      />
      <ScoreCard
        href="/today/effort"
        label="Effort"
        score={effortScore}
        trendArrow={fatigueSignal.arrow}
        trendClass={fatigueSignal.qualityClass}
        trendLabel={fatigueSignal.label}
      />
      <ScoreCard
        href="/today/sleep"
        label="Sommeil"
        score={sleepScore}
        trendArrow={sleepDisplay.arrow}
        trendClass={sleepDisplay.colorClass}
        trendLabel={sleepDisplay.label}
      />
    </div>
  );
}
