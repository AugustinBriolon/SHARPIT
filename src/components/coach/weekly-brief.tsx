'use client';

import { format, startOfWeek } from 'date-fns';
import { NotebookText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyCoachingBriefViewModel } from '@/hooks/use-data';

const WEEK_OPTS = { weekStartsOn: 1 as const };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-label">{title}</p>
      <div className="text-foreground text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function WeeklyBrief({ onClose }: { onClose: () => void }) {
  const weekStart = format(startOfWeek(new Date(), WEEK_OPTS), 'yyyy-MM-dd');
  const { data: vm, isLoading } = useWeeklyCoachingBriefViewModel(weekStart);
  const showSkeleton = isLoading || !vm;
  const showEmptyState = !showSkeleton && vm.emptyState;
  const showContent = !showSkeleton && !vm.emptyState;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookText className="text-primary size-4" />
            Ma semaine
          </DialogTitle>
          <DialogDescription>
            {vm ? `${vm.weekStartLabel} — ${vm.weekEndLabel}` : 'Chargement…'}
          </DialogDescription>
        </DialogHeader>

        {showSkeleton && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {showEmptyState && vm?.emptyState && (
          <InkEmptyState
            description={vm.emptyState.description ?? undefined}
            icon={NotebookText}
            title={vm.emptyState.title}
            compact
          />
        )}

        {showContent && vm && (
          <div className="space-y-4">
            {vm.planContext && (
              <Section title="Phase et charge cible">
                <p>
                  {vm.planContext.phaseLabel} — cible{' '}
                  <span className="font-mono">{vm.planContext.targetLoad} TSS</span>
                  {vm.planContext.isDeload ? ' (semaine de récupération)' : ''}
                </p>
                {vm.planContext.focus && (
                  <p className="text-muted-foreground text-xs">{vm.planContext.focus}</p>
                )}
              </Section>
            )}

            {vm.goalContext && (
              <Section title="Objectif">
                <p>{vm.goalContext.title}</p>
                <p className="text-muted-foreground text-xs">
                  {[
                    vm.goalContext.horizonLabel,
                    vm.goalContext.targetDateLabel,
                    vm.goalContext.daysToGo != null ? `J-${vm.goalContext.daysToGo}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </Section>
            )}

            {vm.load && (
              <Section title="Charge planifiée vs. tolérée">
                <p>
                  {vm.load.plannedLoad} TSS planifiés
                  {vm.load.toleratedCeiling != null
                    ? ` sur ~${vm.load.toleratedCeiling} TSS tolérés`
                    : ''}
                </p>
              </Section>
            )}

            {vm.keySessions.length > 0 && (
              <Section title="Séances clés">
                <ul className="space-y-2">
                  {vm.keySessions.map((s) => (
                    <li key={s.sessionId} className="border-border/50 rounded-md border p-2">
                      <p className="text-xs font-medium">
                        {s.dateLabel} · {s.typeLabel}
                        {s.intensityLabel ? ` · ${s.intensityLabel}` : ''}
                      </p>
                      {s.purpose && (
                        <p className="text-muted-foreground mt-0.5 text-xs">{s.purpose}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {vm.recovery && (
              <Section title="Récupération">
                <p className="text-muted-foreground text-xs">{vm.recovery.note}</p>
              </Section>
            )}

            {vm.limitingFactor?.limitingFactorLabel && (
              <Section title="Facteur limitant actuel">
                <p>
                  {vm.limitingFactor.limitingFactorLabel}
                  {vm.limitingFactor.confidenceTierLabel
                    ? ` · ${vm.limitingFactor.confidenceTierLabel}`
                    : ''}
                </p>
                <p className="text-muted-foreground text-xs">{vm.limitingFactor.asOfLabel}</p>
              </Section>
            )}

            {(vm.assumptions.length > 0 || vm.dataGaps.length > 0) && (
              <Section title="Hypothèses et données manquantes">
                <ul className="text-muted-foreground space-y-1 text-xs">
                  {[...vm.assumptions, ...vm.dataGaps].map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </Section>
            )}

            {vm.whatWouldChange.length > 0 && (
              <Section title="Ce qui ferait changer cette semaine">
                <ul className="text-muted-foreground space-y-1 text-xs">
                  {vm.whatWouldChange.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </Section>
            )}

            {vm.learningFeedback.length > 0 && (
              <Section title="Ce que l'historique montre">
                <ul className="space-y-1 text-xs">
                  {vm.learningFeedback.map((item) => (
                    <li key={item.key}>{item.sentence}</li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
