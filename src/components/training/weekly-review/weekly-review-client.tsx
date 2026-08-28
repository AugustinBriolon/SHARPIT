'use client';

import { addDays, format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, RefreshCw } from 'lucide-react';
import { Markdown } from '@/components/coach/chat/markdown';
import { Button } from '@/components/ui/button';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { WeeklyReviewIllustration } from '@/components/training/weekly-review/weekly-review-illustration';
import {
  matchIllustrationKind,
  splitWeeklyReviewSections,
} from '@/components/training/weekly-review/weekly-review-sections';
import { useGenerateWeeklyReview, useLatestWeeklyReview } from '@/hooks/use-coach';
import type { WeeklyStats } from '@/lib/weekly-review';

/** Each chart sits directly above the paragraph it illustrates — reading the
 * numbers and reading the coach's take on them is the same motion, not two
 * separate things the athlete has to connect themselves. */
function WeeklyReviewNarrative({ content, stats }: { content: string; stats: WeeklyStats | null }) {
  const sections = splitWeeklyReviewSections(content);

  return (
    <div className="space-y-5">
      {sections.map((section, index) => {
        const kind = stats ? matchIllustrationKind(section.heading) : null;
        return (
          <div key={`${section.heading}-${index}`}>
            {kind ? <WeeklyReviewIllustration kind={kind} stats={stats!} /> : null}
            <Markdown>{section.body}</Markdown>
          </div>
        );
      })}
    </div>
  );
}

export function WeeklyReviewClient() {
  const { data: review, isLoading } = useLatestWeeklyReview();
  const generate = useGenerateWeeklyReview();

  function handleGenerate() {
    const today = format(new Date(), 'yyyy-MM-dd');
    generate.mutate(today, {
      onError: (error) => toast.error(error.message),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="rounded-analysis-lg h-48 w-full border-0" />
      </div>
    );
  }

  if (!review) {
    return (
      <InkEmptyState
        description="Le premier arrive automatiquement dimanche, ou génère celui de ta semaine en cours maintenant."
        title="Pas encore de bilan"
        action={
          <Button disabled={generate.isPending} size="sm" onClick={handleGenerate}>
            {generate.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            Générer maintenant
          </Button>
        }
      />
    );
  }

  const weekEnd = addDays(review.weekStart, 6);

  return (
    <div className="space-y-3">
      <p className="text-label">
        Semaine du {format(review.weekStart, 'd MMM', { locale: fr })} au{' '}
        {format(weekEnd, 'd MMM', { locale: fr })}
      </p>

      <div className="analysis-panel rounded-analysis-lg px-5 py-5">
        <WeeklyReviewNarrative content={review.content} stats={review.stats} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          Généré {formatDistanceToNow(review.generatedAt, { addSuffix: true, locale: fr })}
        </p>
        <Button disabled={generate.isPending} size="sm" variant="ghost" onClick={handleGenerate}>
          {generate.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          Actualiser
        </Button>
      </div>
    </div>
  );
}
