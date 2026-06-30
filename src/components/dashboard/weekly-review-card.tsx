"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarRange, Loader2, RefreshCw } from "lucide-react";
import { Markdown } from "@/components/coach/markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGenerateWeeklyReview, useWeeklyReview } from "@/hooks/use-coach";

export function WeeklyReviewCard({ date }: { date: Date }) {
  const dateStr = format(date, "yyyy-MM-dd");
  const reviewQuery = useWeeklyReview(dateStr);
  const generate = useGenerateWeeklyReview();

  const review = reviewQuery.data;
  const isBusy = generate.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarRange className="size-4 text-primary" />
            Rétro de la semaine
          </span>
          {review && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generate.mutate(dateStr)}
              disabled={isBusy}
              aria-label="Régénérer la rétro hebdo"
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
      <CardContent>
        {reviewQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Chargement…
          </div>
        ) : review ? (
          <div className="space-y-2">
            <div className="text-sm leading-relaxed [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:my-1 [&_ul]:my-1">
              <Markdown>{review.content}</Markdown>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Semaine du {format(review.weekStart, "d MMM", { locale: fr })} ·
              générée le{" "}
              {format(review.generatedAt, "d MMM 'à' HH:mm", { locale: fr })}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Aucune rétro pour cette semaine. Génère un bilan complet : volume
              réalisé vs prévu, sommeil, récupération et plan pour la suite.
            </p>
            <Button onClick={() => generate.mutate(dateStr)} disabled={isBusy}>
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
            {generate.isError && (
              <p className="text-xs text-destructive">{generate.error.message}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
