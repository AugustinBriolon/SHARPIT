'use client';

import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Coffee, Droplets, Pencil, Smile, Check } from 'lucide-react';
import { SignalSegment } from '@/components/journal/signal-segment';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { Button } from '@/components/ui/button';
import { DAY_CONTEXT_FACTORS, type DayContextFactorId } from '@/lib/health/day-context-factors';
import {
  emptyDayJournalEntry,
  JOURNAL_DAYTIME_FACTOR_IDS,
  JOURNAL_PRIOR_NIGHT_FACTOR_IDS,
  readDayJournalStore,
  type DayJournalEntry,
  type DayJournalFactorState,
  upsertDayJournalEntry,
  writeDayJournalStore,
} from '@/lib/health/day-journal';
import { trainingDayIdForNow } from '@/lib/training/training-day';
import { cn } from '@/lib/utils';

const MorningWellnessDialog = dynamic(
  () =>
    import('@/components/today/dashboard/morning-wellness-dialog').then(
      (mod) => mod.MorningWellnessDialog,
    ),
  { ssr: false },
);

function factorLabel(id: DayContextFactorId): string {
  return DAY_CONTEXT_FACTORS.find((factor) => factor.id === id)?.label ?? id;
}

function factorHint(id: DayContextFactorId): string {
  return DAY_CONTEXT_FACTORS.find((factor) => factor.id === id)?.hint ?? '';
}

function JournalMetricRow({
  icon: Icon,
  iconClassName,
  label,
  value,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
  label: string;
  value: string;
  action: ReactNode;
}) {
  return (
    <div className="border-analysis-border/60 flex items-center gap-3 border-b px-3 py-3 last:border-b-0">
      <span
        className={cn(
          'bg-muted text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-xl',
          iconClassName,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-data mt-0.5 text-xs tabular-nums">{value}</p>
      </div>
      {action}
    </div>
  );
}

function useDayJournal(trainingDayId: string | null) {
  const [entry, setEntry] = useState<DayJournalEntry | null>(null);

  useEffect(() => {
    if (!trainingDayId) {
      return;
    }
    const store = readDayJournalStore();
    setEntry(store.byDay[trainingDayId] ?? emptyDayJournalEntry(trainingDayId));
  }, [trainingDayId]);

  const persist = useCallback((next: DayJournalEntry) => {
    setEntry(next);
    const store = readDayJournalStore();
    writeDayJournalStore(upsertDayJournalEntry(store, next));
  }, []);

  return { entry, persist };
}

function MoodAction({
  moodLabel,
  onMoodChange,
}: {
  moodLabel: string | null;
  onMoodChange: (label: string) => void;
}) {
  const saved = Boolean(moodLabel);

  return (
    <MorningWellnessDialog
      triggerLabel={saved ? 'Modifier' : 'Ressenti'}
      triggerAriaLabel={
        saved
          ? `Humeur enregistrée : ${moodLabel}. Appuyer pour modifier`
          : 'Saisir le ressenti du matin'
      }
      triggerChildren={
        saved ? (
          <>
            <Check
              className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              strokeWidth={2.25}
              aria-hidden
            />
            <span>Modifier</span>
            <Pencil
              className="text-muted-foreground size-3 shrink-0 opacity-70"
              strokeWidth={1.8}
              aria-hidden
            />
          </>
        ) : (
          'Ressenti'
        )
      }
      triggerClassName={
        saved
          ? 'border-border bg-muted/60 text-foreground hover:bg-muted gap-1.5 dark:bg-muted/40'
          : 'border-border bg-background text-foreground hover:bg-muted gap-1.5'
      }
      debugBypassCompleted
      onCompleted={(result) => onMoodChange(result.moodLabel)}
    />
  );
}

function useClientTrainingDayId(): string | null {
  const [trainingDayId, setTrainingDayId] = useState<string | null>(null);

  useEffect(() => {
    setTrainingDayId(trainingDayIdForNow());
  }, []);

  return trainingDayId;
}

export function JournalScreen() {
  const trainingDayId = useClientTrainingDayId();
  const { entry, persist } = useDayJournal(trainingDayId);

  function setFactor(id: DayContextFactorId, next: DayJournalFactorState) {
    if (!entry) {
      return;
    }
    persist({
      ...entry,
      factors: { ...entry.factors, [id]: next },
    });
  }

  return (
    <div className="space-y-6">
      <MobileDrillDownHeader backHref="/" backLabel="Aujourd’hui" title="Journal" />

      <p className="text-muted-foreground text-sm text-pretty">
        Contexte du jour pour le coach. Les signaux de nuit portent sur la nuit dernière (J-1 → J).
        Sur le long terme, ce journal nourrira des stats (sommeil, habitudes) — pas encore branché.
      </p>

      {!entry || !trainingDayId ? (
        <div
          aria-label="Chargement du journal"
          className="analysis-panel border-analysis-border/80 rounded-analysis h-40 animate-pulse border"
          aria-busy
        />
      ) : (
        <>
          <section
            aria-labelledby="journal-day-metrics"
            className="analysis-panel border-analysis-border/80 rounded-analysis overflow-hidden border"
          >
            <h2
              className="text-label border-analysis-border/60 border-b px-3 py-2.5"
              id="journal-day-metrics"
            >
              Journée
            </h2>
            <div>
              <JournalMetricRow
                icon={Coffee}
                iconClassName="text-amber-700 dark:text-amber-300"
                label="Caféine"
                value={entry.caffeineMg !== null ? `${entry.caffeineMg} mg` : '— mg'}
                action={
                  <div className="flex gap-1">
                    <Button
                      size="xs"
                      type="button"
                      variant="outline"
                      onClick={() =>
                        persist({
                          ...entry,
                          caffeineMg: Math.max(0, (entry.caffeineMg ?? 0) - 40),
                        })
                      }
                    >
                      −
                    </Button>
                    <Button
                      size="xs"
                      type="button"
                      variant="outline"
                      onClick={() =>
                        persist({
                          ...entry,
                          caffeineMg: (entry.caffeineMg ?? 0) + 40,
                        })
                      }
                    >
                      +
                    </Button>
                  </div>
                }
              />
              <JournalMetricRow
                icon={Smile}
                iconClassName="text-primary"
                label="Humeur"
                value={entry.moodLabel ?? 'Non renseignée'}
                action={
                  <MoodAction
                    moodLabel={entry.moodLabel}
                    onMoodChange={(label) => persist({ ...entry, moodLabel: label })}
                  />
                }
              />
              <JournalMetricRow
                icon={Droplets}
                iconClassName="text-sky-700 dark:text-sky-300"
                label="Hydratation"
                value={entry.hydrationMl !== null ? `${entry.hydrationMl} ml` : '— ml'}
                action={
                  <div className="flex gap-1">
                    <Button
                      size="xs"
                      type="button"
                      variant="outline"
                      onClick={() =>
                        persist({
                          ...entry,
                          hydrationMl: Math.max(0, (entry.hydrationMl ?? 0) - 250),
                        })
                      }
                    >
                      −
                    </Button>
                    <Button
                      size="xs"
                      type="button"
                      variant="outline"
                      onClick={() =>
                        persist({
                          ...entry,
                          hydrationMl: (entry.hydrationMl ?? 0) + 250,
                        })
                      }
                    >
                      +
                    </Button>
                  </div>
                }
              />
            </div>
          </section>

          <section
            aria-labelledby="journal-prior-night"
            className="analysis-panel border-analysis-border/80 rounded-analysis overflow-hidden border"
          >
            <div className="border-analysis-border/60 border-b px-3 py-2.5">
              <h2 className="text-label" id="journal-prior-night">
                Nuit dernière
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
                De la veille au réveil (J-1 → J) — ce que lit le coach pour la récupération.
              </p>
            </div>
            <ul className="divide-analysis-border/60 divide-y">
              {JOURNAL_PRIOR_NIGHT_FACTOR_IDS.map((id) => {
                const state = entry.factors[id] ?? 'unset';
                return (
                  <li key={id} className="flex items-center justify-between gap-3 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{factorLabel(id)}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
                        {factorHint(id)}
                      </p>
                    </div>
                    <SignalSegment
                      label={factorLabel(id)}
                      state={state}
                      onChange={(next) => setFactor(id, next)}
                    />
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            aria-labelledby="journal-day-signals"
            className="analysis-panel border-analysis-border/80 rounded-analysis overflow-hidden border"
          >
            <div className="border-analysis-border/60 border-b px-3 py-2.5">
              <h2 className="text-label" id="journal-day-signals">
                Signaux du jour
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
                Sur la journée d’entraînement en cours.
              </p>
            </div>
            <ul className="divide-analysis-border/60 divide-y">
              {JOURNAL_DAYTIME_FACTOR_IDS.map((id) => {
                const state = entry.factors[id] ?? 'unset';
                return (
                  <li key={id} className="flex items-center justify-between gap-3 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{factorLabel(id)}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
                        {factorHint(id)}
                      </p>
                    </div>
                    <SignalSegment
                      label={factorLabel(id)}
                      state={state}
                      onChange={(next) => setFactor(id, next)}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
