'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Markdown } from '@/components/coach/markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyBriefing, useGenerateBriefing } from '@/hooks/use-coach';

export function BriefingCard({ date }: { date: Date }) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const briefingQuery = useDailyBriefing(dateStr);
  const generate = useGenerateBriefing();

  const briefing = briefingQuery.data;
  const isBusy = generate.isPending;

  return (
    <Card className="border-primary/20 from-primary/5 bg-linear-to-br to-transparent">
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center justify-between gap-3 text-base font-medium">
          <span className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" />
            Bilan du jour
          </span>
          {briefing && (
            <Button
              aria-label="Régénérer le bilan"
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
      <CardContent>
        {briefingQuery.isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Chargement…
          </div>
        ) : briefing ? (
          <div className="space-y-2">
            <div className="text-sm leading-relaxed [&_p]:my-1 [&_ul]:my-1">
              <Markdown>{briefing.content}</Markdown>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Généré le {format(briefing.generatedAt, "d MMM 'à' HH:mm", { locale: fr })}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">
              Aucun bilan pour ce jour. Génère-le à partir de ta forme, ta charge et ta séance
              prévue.
            </p>
            <Button disabled={isBusy} onClick={() => generate.mutate(dateStr)}>
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
              <p className="text-destructive text-xs">{generate.error.message}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
