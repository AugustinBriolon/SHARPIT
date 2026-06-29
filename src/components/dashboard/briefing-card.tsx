"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Markdown } from "@/components/coach/markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDailyBriefing, useGenerateBriefing } from "@/hooks/use-coach";

export function BriefingCard({ date }: { date: Date }) {
  const dateStr = format(date, "yyyy-MM-dd");
  const briefingQuery = useDailyBriefing(dateStr);
  const generate = useGenerateBriefing();

  const briefing = briefingQuery.data;
  const isBusy = generate.isPending;

  return (
    <Card className="border-primary/20 bg-linear-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Bilan du jour
          </span>
          {briefing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generate.mutate(dateStr)}
              disabled={isBusy}
              aria-label="Régénérer le bilan"
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
        {briefingQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Chargement…
          </div>
        ) : briefing ? (
          <div className="space-y-2">
            <div className="text-sm leading-relaxed [&_p]:my-1 [&_ul]:my-1">
              <Markdown>{briefing.content}</Markdown>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Généré le{" "}
              {format(briefing.generatedAt, "d MMM 'à' HH:mm", { locale: fr })}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Aucun bilan pour ce jour. Génère-le à partir de ta forme, ta charge
              et ta séance prévue.
            </p>
            <Button onClick={() => generate.mutate(dateStr)} disabled={isBusy}>
              {isBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Génération…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Générer le bilan
                </>
              )}
            </Button>
            {generate.isError && (
              <p className="text-xs text-destructive">
                {generate.error.message}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
