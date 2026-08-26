'use client';

import Link from 'next/link';
import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { ExpertModeToggle } from '@/components/display-mode/expert-mode-toggle';
import { CalendarClock } from 'lucide-react';
import dynamic from 'next/dynamic';

import {
  InstrumentListChip,
  splitInstrumentMeta,
} from '@/components/ui/instruments/instrument-list-chip';
import type { InstrumentListChipMeta } from '@/components/ui/instruments/instrument-list-chip';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { BrickOverviewCard } from '@/components/planning/brick/brick-overview-card';
import { MorningOrientationActions } from '@/components/today/rich/morning-orientation-actions';
import { SessionLinkSuggestionCard } from '@/components/today/rich/session-link-suggestion-card';
import { ActivityFeelingPrompt } from '@/components/training/activity/detail/activity-feeling-prompt';
import { useAppModal } from '@/providers/app-modal-provider';
import { useSyncExternalStore, useMemo } from 'react';
import {
  filterDismissedSessionLinkSuggestions,
  getDismissedSessionLinkIdsSnapshot,
  subscribeSessionLinkDismissals,
} from '@/lib/today/session-link-dismissals';
import {
  filterDaySummaryForLinkExclusions,
  idsExcludedByLinkSuggestions,
  mergeLinkExclusions,
} from '@/lib/today/session-link-suggestions';
import {
  filterDemoLinkedSessionSuggestions,
  getDemoSessionLinksSnapshot,
  readDemoSessionLinks,
  subscribeDemoSessionLinks,
} from '@/lib/demo/demo-session-link-state';

const MorningWellnessDialog = dynamic(
  () =>
    import('@/components/today/dashboard/morning-wellness-dialog').then(
      (mod) => mod.MorningWellnessDialog,
    ),
  { ssr: false },
);

/**
 * Session response — single block answering “quoi aujourd’hui ?”
 * Morning firm actions live here; post-choice is annotated on the session chip.
 */
export function TodayActionRow({
  loading = false,
  onWellnessCompleted,
  trainingDayId,
  vm,
}: {
  vm: TodayViewModel;
  trainingDayId: string;
  onWellnessCompleted?: () => void;
  loading?: boolean;
}) {
  const { openPlannedSession } = useAppModal();
  const dismissedSnapshot = useSyncExternalStore(
    subscribeSessionLinkDismissals,
    getDismissedSessionLinkIdsSnapshot,
    () => '',
  );
  const demoLinksSnapshot = useSyncExternalStore(
    subscribeDemoSessionLinks,
    getDemoSessionLinksSnapshot,
    () => '',
  );
  const dismissedLinkIds = useMemo(
    () => new Set(dismissedSnapshot ? dismissedSnapshot.split('\0') : []),
    [dismissedSnapshot],
  );
  const demoLinks = useMemo(() => {
    if (!demoLinksSnapshot) return readDemoSessionLinks();
    return demoLinksSnapshot
      .split('\n')
      .map((line) => {
        const [plannedSessionId, activityId] = line.split('\0');
        return { plannedSessionId, activityId };
      })
      .filter((entry): entry is { plannedSessionId: string; activityId: string } =>
        Boolean(entry.plannedSessionId && entry.activityId),
      );
  }, [demoLinksSnapshot]);
  const pendingLinkSuggestions = filterDismissedSessionLinkSuggestions(
    vm.actionRow.sessionLinkSuggestions,
    dismissedLinkIds,
  );
  const sessionLinkSuggestions = filterDemoLinkedSessionSuggestions(
    pendingLinkSuggestions,
    new Set(demoLinks.map((entry) => entry.plannedSessionId)),
  );
  const linkExclusions = mergeLinkExclusions(idsExcludedByLinkSuggestions(pendingLinkSuggestions), {
    activityIds: new Set(demoLinks.map((entry) => entry.activityId)),
    plannedSessionIds: new Set(demoLinks.map((entry) => entry.plannedSessionId)),
  });

  const orientation = loading ? null : vm.morningOrientation;

  const proposalSessionId =
    orientation?.confirmEase?.sessionId ?? orientation?.confirmIncrease?.sessionId ?? null;
  /** Proposal card replaces the targeted session chip — keep any other day lines. */
  const baseSessionLines = proposalSessionId
    ? vm.actionRow.daySummaryLines.filter((line) => line.id !== proposalSessionId)
    : vm.actionRow.daySummaryLines;
  /** Pending link suggestions own the pair — hide duplicate chips until link/dismiss. */
  const sessionLines = filterDaySummaryForLinkExclusions(baseSessionLines, linkExclusions);
  const primaryIndex = sessionLines.findIndex((line) => line.kind === 'planned' && !line.isDone);

  const postSessionLoop =
    vm.postSessionLoop?.visible &&
    pendingLinkSuggestions.length === 0 &&
    !linkExclusions.activityIds.has(vm.postSessionLoop.activityId)
      ? vm.postSessionLoop
      : null;

  const daySummaryEmpty =
    !loading && sessionLines.length === 0 && sessionLinkSuggestions.length === 0;
  const reminders =
    !loading &&
    !vm.hero.twinTrustStrip.limitingCauseText &&
    vm.actionRow.limitingMode === 'facts' &&
    vm.actionRow.limitingFacts.length > 0
      ? vm.actionRow.limitingFacts
      : [];

  return (
    <section aria-busy={loading || undefined} className="space-y-3">
      <div className="flex h-8 items-center justify-between gap-2 px-0.5">
        <h2 className="text-label text-balance">{vm.actionRow.actionLabel}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {!loading ? <ExpertModeToggle /> : null}
          {loading ? (
            <SkeletonDataValue heightClassName="h-8" widthClassName="w-24" />
          ) : (
            <MorningWellnessDialog onCompleted={onWellnessCompleted} />
          )}
        </div>
      </div>

      {orientation ? (
        <MorningOrientationActions
          orientation={orientation}
          trainingDayId={trainingDayId}
          onRefreshed={onWellnessCompleted}
        />
      ) : null}

      {reminders.length > 0 ? (
        <ul className="text-muted-foreground space-y-1 px-0.5 text-xs leading-relaxed text-pretty">
          {reminders.map((fact) => (
            <li key={`${fact.label}-${fact.value}`}>
              <span className="text-foreground/80 font-medium">{fact.label}</span>
              {' · '}
              <span className="tabular-nums">{fact.value}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {loading && (
        <div className="chip-surface rounded-analysis space-y-1 px-3 py-3">
          <SkeletonDataValue heightClassName="h-5" widthClassName="w-full max-w-[240px]" />
          <div className="flex h-3.75 items-center gap-1.5">
            <SkeletonDataValue heightClassName="h-3.75" widthClassName="w-15" />
            <span className="opacity-30" aria-hidden>
              ·
            </span>
            <SkeletonDataValue heightClassName="h-full" widthClassName="w-10" />
            <span className="opacity-30" aria-hidden>
              ·
            </span>
            <SkeletonDataValue heightClassName="h-full" widthClassName="w-10" />
          </div>
        </div>
      )}

      {!loading && daySummaryEmpty ? (
        <div className="border-analysis-border/80 bg-background/50 rounded-analysis space-y-2 border px-3 py-3">
          <p className="text-muted-foreground text-sm text-pretty">
            {vm.actionRow.daySummaryEmptyText}
          </p>
          <Link
            className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
            href={vm.actionRow.daySummaryEmptyHref}
          >
            <CalendarClock className="size-3.5" />
            Voir le planning
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : null}

      {!loading && sessionLinkSuggestions.length > 0 ? (
        <ul className="space-y-2">
          {sessionLinkSuggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <SessionLinkSuggestionCard
                suggestion={suggestion}
                onLinked={onWellnessCompleted}
                onOpenPlanned={() => openPlannedSession({ sessionId: suggestion.plannedSessionId })}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && sessionLines.length > 0 ? (
        <ul className="space-y-2">
          {sessionLines.map((line, index) => {
            if (line.brickLegs && line.brickLegs.length > 0 && line.brickGroupId) {
              return (
                <li key={line.id}>
                  <BrickOverviewCard
                    brickGroupId={line.brickGroupId}
                    defaultExpanded={index === primaryIndex && !orientation?.showFirmActions}
                    legs={line.brickLegs}
                    subtitle={line.secondary ?? null}
                    onOpenLeg={(legId) => openPlannedSession({ sessionId: legId })}
                  />
                </li>
              );
            }

            const rawMeta = splitInstrumentMeta(line.secondary);
            const meta: InstrumentListChipMeta[] =
              line.kind === 'missed'
                ? rawMeta.map((text, i) => (i === 0 ? { text, tone: 'caution' as const } : text))
                : rawMeta;
            if (line.morningChoiceLabel) {
              meta.push({ text: line.morningChoiceLabel, tone: 'caution' });
            }
            const openPlanned =
              line.kind === 'planned' || line.kind === 'missed'
                ? () => openPlannedSession({ sessionId: line.id })
                : undefined;
            return (
              <li key={line.id}>
                <InstrumentListChip
                  activityType={line.activityType}
                  done={line.isDone}
                  href={openPlanned ? undefined : line.href}
                  meta={meta}
                  primary={index === primaryIndex && !orientation?.showFirmActions}
                  title={line.primary}
                  onClick={openPlanned}
                />
              </li>
            );
          })}
        </ul>
      ) : null}

      {!loading && postSessionLoop ? (
        <div className="border-analysis-border/80 bg-background/50 rounded-analysis space-y-2 border px-3 py-3">
          <p className="text-sm font-medium text-pretty">{postSessionLoop.activityTitle}</p>
          {postSessionLoop.freshnessLine ? (
            <p className="text-muted-foreground text-xs text-pretty">
              {postSessionLoop.freshnessLine}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              className="text-primary text-xs font-medium hover:underline"
              href={postSessionLoop.narrativeHref}
            >
              Voir le récit de séance
              <span aria-hidden> →</span>
            </Link>
            {postSessionLoop.needsFeeling ? (
              <ActivityFeelingPrompt activityId={postSessionLoop.activityId} />
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? null : (
        <DiscussWithCoachButton
          className="w-full"
          label="Discuter de ma journée"
          size="sm"
          target={{ kind: 'today' }}
        />
      )}
    </section>
  );
}
