'use client';

import { Loader2, Lock, Sparkles } from 'lucide-react';
import { ActivityNarrativeCard } from '@/components/training/activity/insights/activity-narrative-card';
import { Button } from '@/components/ui/button';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { useActivityNarrativeSection } from '@/components/training/activity/insights/use-activity-narrative-section';

function NarrativeLoadingSection() {
  return (
    <section className="bg-analysis-surface-alt rounded-analysis-lg flex h-full flex-col px-5 py-5 sm:px-6 sm:py-6">
      <p className="text-label inline-flex items-center gap-2">
        <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden />
        Lecture du coach
      </p>
      <div className="mt-4 flex items-start gap-3">
        <Loader2 className="text-primary mt-0.5 size-4 shrink-0 animate-spin" />
        <div className="space-y-1">
          <p className="font-medium">Synthèse en cours</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            SHARPIT prépare une lecture de ta séance. Tu peux quitter — elle sera prête au retour.
          </p>
        </div>
      </div>
    </section>
  );
}

function NarrativeGenerateSection({
  generating,
  onGenerate,
  trialCreditsLeft,
}: {
  generating: boolean;
  onGenerate: () => void;
  trialCreditsLeft?: number;
}) {
  return (
    <section className="bg-analysis-surface-alt rounded-analysis-lg flex h-full flex-col space-y-3 px-5 py-5 sm:px-6 sm:py-6">
      <p className="text-label inline-flex items-center gap-2">
        <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden />
        Lecture du coach
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        La synthèse n’est pas encore disponible. Tu peux la relancer.
      </p>
      {trialCreditsLeft !== undefined ? (
        <p className="text-muted-foreground text-xs">
          Essai gratuit — {trialCreditsLeft} synthèse{trialCreditsLeft > 1 ? 's' : ''} restante
          {trialCreditsLeft > 1 ? 's' : ''}
        </p>
      ) : null}
      <Button disabled={generating} size="sm" type="button" variant="outline" onClick={onGenerate}>
        <Sparkles className="size-4" />
        Générer la synthèse
      </Button>
    </section>
  );
}

function NarrativeLockedSection() {
  return (
    <InkEmptyState
      description="L'analyse de séance approfondie fait partie de Pro. Tu as déjà utilisé tes essais gratuits."
      icon={Lock}
      title="Fonctionnalité Pro"
      action={
        <LinkButton href="/settings/pro" size="sm" variant="outline">
          Voir ce que Pro apporte
        </LinkButton>
      }
    />
  );
}

interface ActivityNarrativeSectionProps {
  activityId: string;
  activityType: import('@prisma/client').ActivityType;
  activityDate: Date | string;
  narrativeAnalysis: unknown;
  narrativeAnalyzedAt: Date | string | null;
  coachEnabled: boolean;
  isPro?: boolean;
  trialCreditsLeft?: number;
}

function isNarrativeLoadingState(state: ReturnType<typeof useActivityNarrativeSection>): boolean {
  return state.demoReadingPending || state.isPending || state.generating;
}

/** Demo shows canned data — never gate it, real athletes only. */
function isNarrativeLockedForTrial(
  state: ReturnType<typeof useActivityNarrativeSection>,
  access: { isPro: boolean; trialCreditsLeft: number },
): boolean {
  return !state.isDemoLinkStory && !access.isPro && access.trialCreditsLeft <= 0;
}

function resolveNarrativeView(
  state: ReturnType<typeof useActivityNarrativeSection>,
  access: { isPro: boolean; trialCreditsLeft: number },
) {
  if (state.hasAnalysis) {
    return 'card' as const;
  }
  if (!state.eligible && !state.isDemoLinkStory) {
    return 'hidden' as const;
  }
  if (state.isDemoLinkStory && !state.demoLink) {
    return 'hidden' as const;
  }
  if (isNarrativeLoadingState(state)) {
    return 'loading' as const;
  }
  if (isNarrativeLockedForTrial(state, access)) {
    return 'locked' as const;
  }
  return 'generate' as const;
}

export function ActivityNarrativeSection(props: ActivityNarrativeSectionProps) {
  const state = useActivityNarrativeSection({
    activityId: props.activityId,
    activityType: props.activityType,
    activityDate: props.activityDate,
    initialAnalysis: props.narrativeAnalysis,
    initialAnalyzedAt: props.narrativeAnalyzedAt,
    coachEnabled: props.coachEnabled,
  });
  const isPro = props.isPro ?? false;
  const trialCreditsLeft = props.trialCreditsLeft ?? 0;
  const view = resolveNarrativeView(state, { isPro, trialCreditsLeft });

  if (view === 'hidden') {
    return null;
  }

  if (view === 'card') {
    const analysis = state.parseNarrative(state.narrativeAnalysis)!;
    return (
      <ActivityNarrativeCard
        activityType={state.activityType}
        analysis={analysis}
        narrativeAnalyzedAt={state.narrativeAnalyzedAt}
      />
    );
  }

  if (view === 'loading') {
    return <NarrativeLoadingSection />;
  }

  if (view === 'locked') {
    return <NarrativeLockedSection />;
  }

  return (
    <NarrativeGenerateSection
      generating={state.generating}
      trialCreditsLeft={isPro ? undefined : trialCreditsLeft}
      onGenerate={() => void state.handleGenerate()}
    />
  );
}
