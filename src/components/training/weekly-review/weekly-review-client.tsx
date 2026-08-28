'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, RefreshCw } from 'lucide-react';
import { Markdown } from '@/components/coach/chat/markdown';
import { Button } from '@/components/ui/button';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useGenerateWeeklyReview, useLatestWeeklyReview } from '@/hooks/use-coach';

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

  return (
    <div className="space-y-3">
      <div className="analysis-panel rounded-analysis-lg px-5 py-5">
        <Markdown>{review.content}</Markdown>
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
