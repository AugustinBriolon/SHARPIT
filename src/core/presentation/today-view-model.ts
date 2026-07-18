import type { ProductInsight } from '@/core/product-insight/types';
import type { ActivityType } from '@prisma/client';
import type {
  PresentationAction,
  PresentationConfidence,
  PresentationEmptyState,
  PresentationHierarchy,
  PresentationNavigationTarget,
  PresentationSection,
} from '@/core/presentation/types';

export type TodayViewModel = {
  /** Indique si la page peut être rendue (données suffisantes). */
  hasContent: boolean;
  emptyState: PresentationEmptyState | null;

  /** Texte affiché par le statut principal. */
  statusMessage: string | null;

  confidencePresentation: PresentationConfidence;

  effortUnavailableMessage: string | null;

  /** Navigation targets are pre-resolved hrefs (client is renderer only). */
  navigationTargets: {
    sleep: PresentationNavigationTarget;
    recovery: PresentationNavigationTarget;
    effort: PresentationNavigationTarget;
    adaptation: PresentationNavigationTarget;
    planning: PresentationNavigationTarget;
    physical: PresentationNavigationTarget;
  };

  /** HERO = What to do now */
  hero: {
    eyebrow: string;
    headline: string;
    subline: string;
    posture: 'protect' | 'steady' | 'push' | 'uncertain';
    postureLabel: string;
    focusPriority: string | null;
    goalLine: string | null;
    actionLine: string | null;
    adaptationReminders: string[];
    verdictStyle: {
      showVerdictColors: boolean;
      bgClass: string;
      colorClass: string;
    };
    metricsRow: {
      sleepScore: number | null;
      recoveryScore: number | null;
      effortScore: number | null;
      adaptationScore: number | null;
      effortUnavailableCaption: string | null;
      adaptationUnavailableCaption: string | null;
    };
    twinTrustStrip: {
      confidenceLabel: string | null;
      confidencePctRounded: number | null;
      confidenceHref: string | null;
      limitingFactorText: string | null;
    };
  };

  whyBlock: {
    title: string;
    /** @deprecated Prefer facts — kept for transitional renderers. */
    lines: string[];
    facts: Array<{ label: string; value: string; hint?: string | null }>;
    visible: boolean;
  };

  actionRow: {
    showLimitingColumn: boolean;
    limitingLabel: string;
    limitingMode: 'facts' | 'list' | 'link' | 'text' | 'none';
    limitingLines: string[];
    limitingText: string | null;
    limitingHref: string | null;
    limitingFacts: Array<{ label: string; value: string; hint?: string | null }>;
    actionLabel: string;
    daySummaryEmptyText: string;
    daySummaryEmptyHref: string;
    /** Rendered list already contains resolved links. */
    daySummaryLines: Array<{
      id: string;
      activityType: ActivityType;
      primary: string;
      secondary?: string | null;
      kind: 'done' | 'planned';
      href: string;
      isDone: boolean;
    }>;
    primaryAction?: PresentationAction | null;
  };

  weeklyTrajectory: {
    eyebrow: string;
    headline: string;
    detail: string | null;
    trendArrow: string;
    trendClass: string;
    drillDownLinks: Array<{ label: string; href: string }>;
    hasSparks: boolean;
    emptyTrajectoryText: string;
    sparks: {
      recoveryValues: Array<number | null>;
      effortValues: Array<number | null>;
    };
  };

  insights: ProductInsight[];

  /** Environmental context when training impact is significant (Phase 3). */
  environmentContext: {
    visible: boolean;
    summaryLine: string | null;
    detailLine: string | null;
    thermalLabel: string | null;
  } | null;

  hierarchy: PresentationHierarchy;
  sections: PresentationSection[];
};

// Alias de nommage demandé (Presentation Layer naming).
export type TodayPresentationViewModel = TodayViewModel;
