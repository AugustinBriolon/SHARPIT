'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, MessageCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Markdown } from '@/components/coach/markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { useDailyBriefing, useGenerateBriefing } from '@/hooks/use-coach';

/** Message narratif unique du jour (ex-briefing), format compact. */
export function TodayCoachMessage({ date }: { date: Date }) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const briefingQuery = useDailyBriefing(dateStr);
  const generate = useGenerateBriefing();
  const briefing = briefingQuery.data;
  const isBusy = generate.isPending;

  const renderContent = () => {
    if (briefingQuery.isLoading) {
      return (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> Chargement…
        </div>
      );
    }

    if (briefing) {
      return (
        <>
          <div className="text-sm leading-relaxed [&_p]:my-1.5 [&_ul]:my-1.5">
            <Markdown>{briefing.content}</Markdown>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/coach" size="sm" variant="outline">
              <MessageCircle className="size-3.5" />
              Discuter avec le coach
            </LinkButton>
            <LinkButton href="/seances?tab=planning" size="sm" variant="ghost">
              Voir le planning
            </LinkButton>
          </div>
          <p className="text-muted-foreground text-[11px]">
            Généré le {format(briefing.generatedAt, "d MMM 'à' HH:mm", { locale: fr })}
          </p>
        </>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Pas encore de message pour ce jour. Génère une synthèse à partir de ta forme, ta charge et
          ta séance prévue.
        </p>
        <Button disabled={isBusy} onClick={() => generate.mutate(dateStr)}>
          {isBusy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Génération…
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Générer le message
            </>
          )}
        </Button>
        {generate.isError && <p className="text-destructive text-xs">{generate.error.message}</p>}
      </div>
    );
  };

  return (
    <Card className="border-primary/20 from-primary/5 bg-linear-to-br to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-muted-foreground flex items-center justify-between gap-3 text-base font-medium">
          <span className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" />
            Coach du jour
          </span>
          {briefing && (
            <Button
              aria-label="Régénérer le message"
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
      <CardContent className="space-y-4">{renderContent()}</CardContent>
    </Card>
  );
}
