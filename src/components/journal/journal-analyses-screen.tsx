'use client';

import { BookOpen, ChartLine, Sparkles } from 'lucide-react';
import {
  COACH_DISCUSS_LABEL,
  CoachDiscussIcon,
  DiscussWithCoachButton,
} from '@/components/coach/discuss/discuss-with-coach-button';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { journalCategoryIcon } from '@/lib/health/journal-category-surface';
import {
  compileJournalHabitFindings,
  partitionCompiledFindings,
  type CompiledJournalHabitFinding,
  type JournalHabitFinding,
} from '@/lib/health/journal-habit-analysis';
import { formatCompiledJournalHabitFinding } from '@/lib/health/journal-habit-finding-copy';
import {
  buildJournalHabitReading,
  type JournalHabitReading,
} from '@/lib/health/journal-habit-reading';
import { journalTrackableById } from '@/lib/health/journal-trackables';
import { ADEQUATE_TONE, CAUTION_TONE } from '@/lib/presentation/status-surface';
import { cn } from '@/lib/utils';

export function JournalAnalysesScreen({
  daysWithSignal,
  minDays,
  ready,
  findings,
  isPro,
}: {
  daysWithSignal: number;
  minDays: number;
  ready: boolean;
  findings: JournalHabitFinding[];
  isPro: boolean;
}) {
  return (
    <div className="space-y-8">
      <MobileDrillDownHeader backHref="/journal" backLabel="Journal" title="Analyses" />

      {ready ? (
        <JournalAnalysesReady daysWithSignal={daysWithSignal} findings={findings} isPro={isPro} />
      ) : (
        <JournalAnalysesNotReady daysWithSignal={daysWithSignal} minDays={minDays} />
      )}
    </div>
  );
}

function JournalAnalysesNotReady({
  daysWithSignal,
  minDays,
}: {
  daysWithSignal: number;
  minDays: number;
}) {
  const remaining = Math.max(0, minDays - daysWithSignal);
  const progress = Math.min(1, daysWithSignal / minDays);

  return (
    <div className="space-y-3">
      <InkEmptyState
        description={`Il faut ${minDays} jours avec au moins un signal journal avant d’ouvrir les lectures.`}
        icon={ChartLine}
        title="Pas encore assez de données"
        action={
          <LinkButton href="/journal" size="sm" variant="outline">
            <BookOpen className="size-3.5" aria-hidden />
            Retour au journal
          </LinkButton>
        }
      />
      <div className="px-1">
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-200 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="text-muted-foreground text-data mt-2 text-center text-xs tabular-nums">
          {daysWithSignal} / {minDays} jours
          {remaining > 0 ? ` · encore ${remaining}` : ''}
        </p>
      </div>
    </div>
  );
}

function JournalAnalysesIntro() {
  return (
    <div className="max-w-prose space-y-1.5 px-0.5">
      <p className="text-sm text-pretty">
        Repère les habitudes du journal qui bougent avec ton sommeil ou ta récupération — pour
        choisir <span className="font-medium">une expérience sur 7 jours</span>, pas pour prouver
        une cause.
      </p>
      <p className="text-muted-foreground text-xs text-pretty">
        Médiane des jours avec l’habitude vs sans. Charge, voyage et maladie ne sont pas contrôlés.
      </p>
    </div>
  );
}

function MediumFindingsSection({
  minusMedium,
  plusMedium,
}: {
  minusMedium: CompiledJournalHabitFinding[];
  plusMedium: CompiledJournalHabitFinding[];
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1 px-0.5">
        <h2 className="text-section-title">Pistes à confirmer</h2>
        <p className="text-muted-foreground text-xs text-pretty">
          Échantillon court ou écart juste au seuil — à surveiller, pas à conclure.
        </p>
      </div>
      <WeakSignalsPanel findings={[...minusMedium, ...plusMedium]} />
    </div>
  );
}

function JournalAnalysesReady({
  daysWithSignal,
  findings,
  isPro,
}: {
  daysWithSignal: number;
  findings: JournalHabitFinding[];
  isPro: boolean;
}) {
  const compiled = compileJournalHabitFindings(findings);
  const { plusHigh, minusHigh, plusMedium, minusMedium } = partitionCompiledFindings(compiled);
  const hasHigh = plusHigh.length > 0 || minusHigh.length > 0;
  const hasMedium = plusMedium.length > 0 || minusMedium.length > 0;
  const reading = buildJournalHabitReading(findings, daysWithSignal);

  return (
    <div className="space-y-8">
      <JournalAnalysesIntro />
      <ReadingInstrument isPro={isPro} reading={reading} />
      {!hasHigh && !hasMedium ? (
        <InkEmptyState
          description="Il faut assez de jours avec et sans l’habitude, et un écart net. Les constantes (toujours / jamais) ne produisent pas de contraste."
          icon={ChartLine}
          title="Aucune association nette pour l’instant"
        />
      ) : null}
      {hasHigh ? <AssociationsInstrument minus={minusHigh} plus={plusHigh} /> : null}
      {hasMedium ? (
        <MediumFindingsSection minusMedium={minusMedium} plusMedium={plusMedium} />
      ) : null}
    </div>
  );
}

function ReadingInstrument({ reading, isPro }: { reading: JournalHabitReading; isPro: boolean }) {
  const { priority } = reading;

  return (
    <section
      aria-labelledby="journal-analyses-reading"
      className="analysis-panel-alt border-analysis-border/80 rounded-analysis-lg overflow-hidden border"
    >
      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-2">
          <p className="text-label text-muted-foreground">À retenir</p>
          <h2 className="text-verdict text-pretty" id="journal-analyses-reading">
            {reading.headline}
          </h2>
          <p className="text-muted-foreground text-data text-xs tabular-nums">{reading.summary}</p>
        </div>

        {priority ? (
          <div className="border-analysis-border/50 space-y-3 border-t pt-4">
            <div className="flex items-start gap-3">
              <FactorIcon factorId={priority.factorId} />
              <div className="min-w-0 space-y-1">
                <p className="text-label text-muted-foreground">Priorité</p>
                <p className="text-sm font-medium text-pretty">{priority.title}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-label text-muted-foreground">Expérience suggérée</p>
              <p className="text-sm text-pretty">{reading.actionHint}</p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground border-analysis-border/50 border-t pt-4 text-sm text-pretty">
            {reading.actionHint}
          </p>
        )}

        <CoachReadingCta isPro={isPro} />
      </div>
    </section>
  );
}

function AssociationsInstrument({
  minus,
  plus,
}: {
  minus: CompiledJournalHabitFinding[];
  plus: CompiledJournalHabitFinding[];
}) {
  return (
    <section aria-labelledby="journal-analyses-net" className="space-y-3">
      <div className="space-y-1 px-0.5">
        <h2 className="text-section-title" id="journal-analyses-net">
          Détail des associations
        </h2>
        <p className="text-muted-foreground text-xs text-pretty">
          Les moins = contraste défavorable · Les plus = contraste favorable. Même poids : les deux
          aident à choisir quoi tester.
        </p>
      </div>
      <div className="analysis-panel border-analysis-border/80 rounded-analysis overflow-hidden border">
        <PolarityBlock
          emptyLabel="Aucune association négative nette pour l’instant."
          findings={minus}
          title="Les moins"
          titleId="journal-analyses-minus-high"
          tone="minus"
        />
        <PolarityBlock
          emptyLabel="Aucune association positive nette pour l’instant."
          findings={plus}
          title="Les plus"
          titleId="journal-analyses-plus-high"
          tone="plus"
          bordered
        />
      </div>
    </section>
  );
}

function PolarityBlock({
  title,
  titleId,
  findings,
  tone,
  emptyLabel,
  bordered = false,
}: {
  title: string;
  titleId: string;
  findings: CompiledJournalHabitFinding[];
  tone: 'plus' | 'minus';
  emptyLabel: string;
  bordered?: boolean;
}) {
  const accentDot = tone === 'plus' ? ADEQUATE_TONE.dotClass : CAUTION_TONE.dotClass;

  return (
    <div className={cn(bordered && 'border-analysis-border/60 border-t')}>
      <div className="border-analysis-border/50 flex items-center gap-2 border-b px-3 py-2.5">
        <span className={cn('size-1.5 shrink-0 rounded-full', accentDot)} aria-hidden />
        <h3 className="text-label" id={titleId}>
          {title}
        </h3>
        <span className="text-muted-foreground text-data ms-auto text-[11px] tabular-nums">
          {findings.length}
        </span>
      </div>
      {findings.length === 0 ? (
        <p className="text-muted-foreground px-3 py-3.5 text-xs text-pretty">{emptyLabel}</p>
      ) : (
        <ul aria-labelledby={titleId} className="divide-analysis-border/60 divide-y">
          {findings.map((finding) => (
            <FindingRow key={`${finding.factorId}-${finding.polarity}`} finding={finding} />
          ))}
        </ul>
      )}
    </div>
  );
}

function WeakSignalsPanel({ findings }: { findings: CompiledJournalHabitFinding[] }) {
  return (
    <div className="analysis-panel border-analysis-border/80 rounded-analysis overflow-hidden border">
      <ul className="divide-analysis-border/60 divide-y">
        {findings.map((finding) => (
          <FindingRow
            key={`${finding.factorId}-${finding.polarity}-weak`}
            finding={finding}
            showPolarityHint
            weak
          />
        ))}
      </ul>
    </div>
  );
}

function FindingRow({
  finding,
  weak = false,
  showPolarityHint = false,
}: {
  finding: CompiledJournalHabitFinding;
  weak?: boolean;
  showPolarityHint?: boolean;
}) {
  const copy = formatCompiledJournalHabitFinding(finding);

  return (
    <li className="px-3 py-3.5">
      <div className="flex items-start gap-3">
        <FactorIcon factorId={finding.factorId} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-sm font-medium text-pretty">{copy.title}</p>
            {weak ? (
              <span className="bg-muted text-muted-foreground shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                Faible
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground text-data text-xs text-pretty tabular-nums">
            {copy.detail}
          </p>
          {showPolarityHint ? (
            <p className="text-muted-foreground text-[11px]">
              {finding.polarity === 'plus' ? 'Plutôt positif' : 'Plutôt négatif'}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function FactorIcon({ factorId }: { factorId: string }) {
  const trackable = journalTrackableById(factorId);
  const Icon = trackable?.icon ?? Sparkles;
  const iconTone = journalCategoryIcon(
    trackable?.category ?? (factorId.startsWith('custom_') ? 'personnalise' : undefined),
  );

  return (
    <span
      className={cn(
        'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
        iconTone,
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.8} aria-hidden />
    </span>
  );
}

function CoachReadingCta({ isPro }: { isPro: boolean }) {
  if (!isPro) {
    return (
      <LinkButton href="/settings/pro" size="sm" variant="outline">
        <CoachDiscussIcon aria-hidden />
        {COACH_DISCUSS_LABEL}
        <span className="text-muted-foreground font-normal"> · Pro</span>
      </LinkButton>
    );
  }

  return <DiscussWithCoachButton size="sm" target={{ kind: 'journal-analyses' }} />;
}
