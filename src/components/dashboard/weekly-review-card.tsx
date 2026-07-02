'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarRange, Loader2, RefreshCw } from 'lucide-react';
import { Markdown } from '@/components/coach/markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGenerateWeeklyReview, useWeeklyReview } from '@/hooks/use-coach';

export function WeeklyReviewCard({ date }: { date: Date }) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const reviewQuery = useWeeklyReview(dateStr);
  const generate = useGenerateWeeklyReview();

  const review = reviewQuery.data;
  const isBusy = generate.isPending;

  const renderContent = () => {
    if (reviewQuery.isLoading) {
      return (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> Chargement…
        </div>
      );
    }

    if (review) {
      return (
        <div className="space-y-2">
          <div className="[&_h2]:text-foreground text-sm leading-relaxed [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:my-1 [&_ul]:my-1">
            <Markdown>{review.content}</Markdown>
          </div>
          <p className="text-muted-foreground text-[11px]">
            Semaine du {format(review.weekStart, 'd MMM', { locale: fr })} · générée le{' '}
            {format(review.generatedAt, "d MMM 'à' HH:mm", { locale: fr })}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground text-sm">
          Aucune rétro pour cette semaine. Génère un bilan complet : volume réalisé vs prévu,
          sommeil, récupération et plan pour la suite.
        </p>
        <Button disabled={isBusy} onClick={() => generate.mutate(dateStr)}>
          {isBusy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Génération…
            </>
          ) : (
            <>
              <CalendarRange className="size-4" /> Générer la rétro
            </>
          )}
        </Button>
        {generate.isError && <p className="text-destructive text-xs">{generate.error.message}</p>}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center justify-between gap-3 text-base font-medium">
          <span className="flex items-center gap-2">
            <CalendarRange className="text-primary size-4" />
            Rétro de la semaine
          </span>
          {review && (
            <Button
              aria-label="Régénérer la rétro hebdo"
              disabled={isBusy}
              size="sm"
              variant="ghost"
              onClick={() => generate.mutate(dateStr)}
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
