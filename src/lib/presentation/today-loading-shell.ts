import type { TodayViewModel } from '@/core/presentation/today-view-model';
import type { DailyPhase } from '@/lib/daily-phase/types';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
import { actionRowLabels, trajectoryEyebrow, whyBlockTitle } from '@/lib/today/today-rich-view';

function shellPhaseFromLocalHour(hour: number): DailyPhase {
  if (hour >= 22) return 'END_OF_DAY';
  if (hour >= 18) return 'RECOVERY_WINDOW';
  if (hour >= 14) return 'SESSION_COMPLETED';
  if (hour >= 10) return 'BEFORE_SESSION';
  return 'MORNING';
}

/** Stable Today chrome for cold-start / placeholder micro-skeletons. */
export function todayLoadingShell(now = new Date()): TodayViewModel {
  const phase = shellPhaseFromLocalHour(now.getHours());
  const labels = actionRowLabels(phase);

  return {
    hasContent: true,
    emptyState: null,
    statusMessage: null,
    confidencePresentation: { pct: null, label: null, tone: 'neutral' },
    effortUnavailableMessage: null,
    morningOrientation: null,
    navigationTargets: {
      sleep: { label: 'Sommeil', href: TWIN_DRILL_DOWN.sleep },
      recovery: { label: 'Récupération', href: TWIN_DRILL_DOWN.recovery },
      effort: { label: 'Effort', href: TWIN_DRILL_DOWN.effort },
      adaptation: { label: 'Adaptation', href: TWIN_DRILL_DOWN.adaptation },
      physical: { label: 'Santé physique', href: TWIN_DRILL_DOWN.physical },
      planning: { label: 'Planning', href: TWIN_DRILL_DOWN.planning },
    },
    hero: {
      eyebrow: 'Ce matin',
      headline: '',
      subline: '',
      posture: 'uncertain',
      postureLabel: '',
      focusPriority: null,
      goalLine: null,
      actionLine: null,
      adaptationReminders: [],
      verdictStyle: {
        showVerdictColors: false,
        bgClass: 'bg-primary/8',
        colorClass: 'text-foreground',
        dotClass: 'bg-primary/50',
        accentBarClass: '',
      },
      metricsRow: {
        sleepScore: null,
        recoveryScore: null,
        effortScore: null,
        adaptationScore: null,
        effortUnavailableCaption: null,
        adaptationUnavailableCaption: null,
      },
      twinTrustStrip: {
        confidenceLabel: null,
        confidencePctRounded: null,
        confidenceHref: null,
        limitingFactorText: null,
        limitingFactorHref: null,
      },
    },
    whyBlock: {
      title: whyBlockTitle(phase),
      lines: [],
      facts: [],
      visible: false,
    },
    actionRow: {
      showLimitingColumn: false,
      limitingLabel: labels.limiting,
      limitingMode: 'none',
      limitingLines: [],
      limitingText: null,
      limitingHref: null,
      limitingFacts: [],
      actionLabel: labels.action,
      daySummaryEmptyText: '',
      daySummaryEmptyHref: TWIN_DRILL_DOWN.planning,
      daySummaryLines: [],
      morningRecalibration: null,
    },
    weeklyTrajectory: {
      eyebrow: trajectoryEyebrow(phase),
      headline: '',
      detail: null,
      trendArrow: '',
      trendClass: 'text-muted-foreground',
      drillDownLinks: [],
      hasSparks: true,
      emptyTrajectoryText: '',
      sparks: {
        recoveryValues: [],
        effortValues: [],
      },
    },
    insights: [],
    environmentContext: null,
    hierarchy: { rootId: 'today', order: [] },
    sections: [],
  };
}
