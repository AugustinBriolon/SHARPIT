'use client';

import { useEffect, useState } from 'react';
import { ActivityType } from '@prisma/client';
import { ActivityNarrativeCard } from '@/components/training/activity/activity-narrative-card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Loader2, Sparkles } from 'lucide-react';
import { isEligibleForActivityNarrative } from '@/lib/activity/activity-narrative-config';
import { isActivityToday } from '@/lib/activity/activity-day';
import { activityNarrativeSchema, type ActivityNarrative } from '@/lib/validators/coach';

const NARRATIVE_POLL_MS = 3_000;
const NARRATIVE_POLL_MAX_MS = 120_000;
const NARRATIVE_TIMEOUT_PREFIX = 'sharpit.narrative-poll-timeout.';

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

function readTimedOut(activityId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(`${NARRATIVE_TIMEOUT_PREFIX}${activityId}`) === '1';
  } catch {
    return false;
  }
}

function writeTimedOut(activityId: string): void {
  try {
    sessionStorage.setItem(`${NARRATIVE_TIMEOUT_PREFIX}${activityId}`, '1');
  } catch {
    // ignore
  }
}

function clearTimedOut(activityId: string): void {
  try {
    sessionStorage.removeItem(`${NARRATIVE_TIMEOUT_PREFIX}${activityId}`);
  } catch {
    // ignore
  }
}

export function ActivityNarrativeSection({
  activityId,
  activityType,
  activityDate,
  narrativeAnalysis: initialAnalysis,
  narrativeAnalyzedAt: initialAnalyzedAt,
  coachEnabled,
}: ActivityNarrativeSectionProps) {
  const [polled, setPolled] = useState<{
    analysis: typeof initialAnalysis;
    analyzedAt: typeof initialAnalyzedAt;
  } | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(() => readTimedOut(activityId));
  const [generating, setGenerating] = useState(false);

  const narrativeAnalysis = polled?.analysis ?? initialAnalysis;
  const narrativeAnalyzedAt = polled?.analyzedAt ?? initialAnalyzedAt;

  const hasAnalysis = Boolean(parseNarrative(narrativeAnalysis) && narrativeAnalyzedAt);
  const eligible =
    coachEnabled &&
    NARRATIVE_TYPES.has(activityType) &&
    isEligibleForActivityNarrative(new Date(activityDate));
  // Only today's sessions are auto-enriched on ingest — poll those. Older = manual button.
  const expectBackgroundIngest = isActivityToday(new Date(activityDate));
  const isPending =
    eligible && !hasAnalysis && !pollTimedOut && !generating && expectBackgroundIngest;

  useEffect(() => {
    setPolled(null);
    setPollTimedOut(readTimedOut(activityId));
  }, [activityId]);

  useEffect(() => {
    if (!initialAnalyzedAt) return;
    setPolled(null);
    clearTimedOut(activityId);
    setPollTimedOut(false);
  }, [activityId, initialAnalyzedAt]);

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
            setPolled({
              analysis: activity.narrativeAnalysis ?? null,
              analyzedAt: activity.narrativeAnalyzedAt,
            });
            clearTimedOut(activityId);
            setPollTimedOut(false);
            return;
          }
        } catch {
          // best-effort polling
        }
      }

      if (!cancelled) {
        writeTimedOut(activityId);
        setPollTimedOut(true);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [activityId, isPending]);

  async function handleGenerate() {
    clearTimedOut(activityId);
    setPollTimedOut(false);
    setGenerating(true);
    const loadingToast = toast.loading('Synthèse en cours');
    try {
      const res = await fetch(`/api/activities/${activityId}/narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, wait: true }),
      });
      const data = (await res.json().catch(() => null)) as {
        narrativeAnalysis?: unknown;
        narrativeAnalyzedAt?: string | null;
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(data?.error ?? 'Synthèse impossible');
        writeTimedOut(activityId);
        setPollTimedOut(true);
        return;
      }
      if (data?.narrativeAnalyzedAt) {
        setPolled({
          analysis: data.narrativeAnalysis ?? null,
          analyzedAt: data.narrativeAnalyzedAt,
        });
        clearTimedOut(activityId);
        setPollTimedOut(false);
        toast.success('Synthèse prête');
      }
    } catch {
      toast.error('Synthèse impossible');
      writeTimedOut(activityId);
      setPollTimedOut(true);
    } finally {
      toast.close(loadingToast);
      setGenerating(false);
    }
  }

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

  if (!eligible) return null;

  if (isPending || generating) {
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

  return (
    <section className="bg-analysis-surface-alt rounded-analysis-lg flex h-full flex-col space-y-3 px-5 py-5 sm:px-6 sm:py-6">
      <p className="text-label inline-flex items-center gap-2">
        <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden />
        Lecture du coach
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        La synthèse n’est pas encore disponible. Tu peux la relancer.
      </p>
      <Button
        disabled={generating}
        size="sm"
        type="button"
        variant="outline"
        onClick={handleGenerate}
      >
        <Sparkles className="size-4" />
        Générer la synthèse
      </Button>
    </section>
  );
}
