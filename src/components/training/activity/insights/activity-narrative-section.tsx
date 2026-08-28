'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { ActivityNarrativeCard } from '@/components/training/activity/insights/activity-narrative-card';
import { Button } from '@/components/ui/button';
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
}: {
  generating: boolean;
  onGenerate: () => void;
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
      <Button disabled={generating} size="sm" type="button" variant="outline" onClick={onGenerate}>
        <Sparkles className="size-4" />
        Générer la synthèse
      </Button>
    </section>
  );
}

interface ActivityNarrativeSectionProps {
  activityId: string;
  activityType: import('@prisma/client').ActivityType;
  activityDate: Date | string;
  narrativeAnalysis: unknown;
  narrativeAnalyzedAt: Date | string | null;
  coachEnabled: boolean;
}

function isNarrativeLoadingState(state: ReturnType<typeof useActivityNarrativeSection>): boolean {
  return state.demoReadingPending || state.isPending || state.generating;
}

function resolveNarrativeView(state: ReturnType<typeof useActivityNarrativeSection>) {
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
  return 'generate' as const;
}

export function ActivityNarrativeSection(props: ActivityNarrativeSectionProps) {
  const state = useActivityNarrativeSection(props);
  const view = resolveNarrativeView(state);

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

  return (
    <NarrativeGenerateSection
      generating={state.generating}
      onGenerate={() => void state.handleGenerate()}
    />
  );
}
