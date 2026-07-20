'use client';

import { useEffect, useState } from 'react';
import { ActivityType } from '@prisma/client';
import { ActivityNarrativeCard } from '@/components/training/activity-narrative-card';
import { Brain, Loader2 } from 'lucide-react';
import { SPORT_IDENTITY_PANEL, SPORT_IDENTITY_TEXT } from '@/lib/activity/sport-identity';
import { isEligibleForActivityNarrative } from '@/lib/activity-narrative-config';
import { activityNarrativeSchema, type ActivityNarrative } from '@/lib/validators/coach';
import { cn } from '@/lib/utils';

const NARRATIVE_POLL_MS = 3_000;
const NARRATIVE_POLL_MAX_MS = 120_000;

const NARRATIVE_TYPES = new Set<ActivityType>([
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
]);

interface ActivityNarrativeSectionProps {
  activityId: string;
  activityType: ActivityType;
  activityDate: Date | string;
  narrativeAnalysis: unknown;
  narrativeAnalyzedAt: Date | string | null;
  coachEnabled: boolean;
}

function parseNarrative(raw: unknown): ActivityNarrative | null {
  const parsed = activityNarrativeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function ActivityNarrativeSection({
  activityId,
  activityType,
  activityDate,
  narrativeAnalysis: initialAnalysis,
  narrativeAnalyzedAt: initialAnalyzedAt,
  coachEnabled,
}: ActivityNarrativeSectionProps) {
  const [narrativeAnalysis, setNarrativeAnalysis] = useState(initialAnalysis);
  const [narrativeAnalyzedAt, setNarrativeAnalyzedAt] = useState(initialAnalyzedAt);

  const hasAnalysis = Boolean(parseNarrative(narrativeAnalysis) && narrativeAnalyzedAt);
  const isPending =
    coachEnabled &&
    NARRATIVE_TYPES.has(activityType) &&
    isEligibleForActivityNarrative(new Date(activityDate)) &&
    !hasAnalysis;

  useEffect(() => {
    setNarrativeAnalysis(initialAnalysis);
    setNarrativeAnalyzedAt(initialAnalyzedAt);
  }, [initialAnalysis, initialAnalyzedAt]);

  useEffect(() => {
    if (!isPending) return;

    const startedAt = Date.now();
    let cancelled = false;

    async function poll() {
      while (!cancelled && Date.now() - startedAt < NARRATIVE_POLL_MAX_MS) {
        await new Promise((resolve) => setTimeout(resolve, NARRATIVE_POLL_MS));
        if (cancelled) return;

        try {
          const response = await fetch(`/api/activities/${activityId}`);
          if (!response.ok) continue;
          const activity = (await response.json()) as {
            narrativeAnalysis?: unknown;
            narrativeAnalyzedAt?: string | null;
          };
          if (activity.narrativeAnalyzedAt) {
            setNarrativeAnalysis(activity.narrativeAnalysis ?? null);
            setNarrativeAnalyzedAt(activity.narrativeAnalyzedAt);
            return;
          }
        } catch {
          // best-effort polling
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [activityId, isPending]);

  if (hasAnalysis) {
    const analysis = parseNarrative(narrativeAnalysis)!;
    return (
      <ActivityNarrativeCard
        activityType={activityType}
        analysis={analysis}
        narrativeAnalyzedAt={narrativeAnalyzedAt}
      />
    );
  }

  if (!isPending) return null;

  const sportText = SPORT_IDENTITY_TEXT[activityType];
  const sportPanel = SPORT_IDENTITY_PANEL[activityType];

  return (
    <section className={cn('rounded-analysis-lg border px-5 py-5 sm:px-6 sm:py-6', sportPanel)}>
      <div className="flex items-center gap-2">
        <Brain className={cn('size-4 shrink-0', sportText)} />
        <p className={cn('text-label', sportText)}>Analyse coach</p>
      </div>
      <div className="mt-4 flex items-start gap-3">
        <Loader2 className={cn('mt-0.5 size-4 shrink-0 animate-spin', sportText)} />
        <div className="space-y-1">
          <p className="font-medium">Synthèse en cours</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            SHARPIT prépare une lecture de ta séance. Elle apparaîtra ici dans quelques instants.
          </p>
        </div>
      </div>
    </section>
  );
}
