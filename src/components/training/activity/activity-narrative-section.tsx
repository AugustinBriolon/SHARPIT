'use client';

import { useEffect, useState } from 'react';
import { ActivityType } from '@prisma/client';
import { ActivityNarrativeCard } from '@/components/training/activity/activity-narrative-card';
import { Loader2 } from 'lucide-react';
import { isEligibleForActivityNarrative } from '@/lib/activity/activity-narrative-config';
import { activityNarrativeSchema, type ActivityNarrative } from '@/lib/validators/coach';

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

  return (
    <section className="bg-analysis-surface-alt rounded-analysis-lg px-5 py-5 sm:px-6 sm:py-6">
      <p className="text-label inline-flex items-center gap-2">
        <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden />
        Lecture du coach
      </p>
      <div className="mt-4 flex items-start gap-3">
        <Loader2 className="text-primary mt-0.5 size-4 shrink-0 animate-spin" />
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
