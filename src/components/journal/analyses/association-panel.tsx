'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { FadeIn, MotionExpand } from '@/components/motion';
import type {
  DomainSectionModel,
  DumbbellRowModel,
  JournalAnalysesViewModel,
} from '@/lib/health/journal-analyses-view-model';
import { cn } from '@/lib/utils';
import { DUMBBELL_GRID, DUMBBELL_LABEL_CELL, DUMBBELL_TRACK_CELL } from './dumbbell-grid';
import { DumbbellRow } from './dumbbell-row';
import { AxisTicks } from './dumbbell-track';

type RowActions = (row: DumbbellRowModel) => ReactNode;

/** Hollow = days without the habit, filled = days with it — same marks as the strips. */
function Legend() {
  return (
    <ul className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <li className="inline-flex items-center gap-1.5">
        <span
          className="border-muted-foreground bg-analysis-surface inline-block size-2.5 shrink-0 rounded-full border-2"
          aria-hidden
        />
        <span>
          Sans l’habitude <span className="text-foreground/70">(médiane)</span>
        </span>
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="bg-foreground inline-block size-2.5 shrink-0 rounded-full" aria-hidden />
        <span>
          Avec l’habitude <span className="text-foreground/70">(médiane)</span>
        </span>
      </li>
    </ul>
  );
}

function DomainSection({
  domain,
  actionsFor,
}: {
  domain: DomainSectionModel;
  actionsFor: RowActions;
}) {
  const titleId = useId();
  return (
    <li>
      <section aria-labelledby={titleId}>
        <div className={cn(DUMBBELL_GRID, 'bg-muted/30 py-2')}>
          <h4 className={cn(DUMBBELL_LABEL_CELL, 'text-label')} id={titleId}>
            {domain.title}
          </h4>
          <span className={DUMBBELL_TRACK_CELL}>
            <AxisTicks ticks={domain.ticks} />
          </span>
        </div>
        <ul aria-labelledby={titleId} className="divide-analysis-border/50 divide-y">
          {domain.rows.map((row) => (
            <DumbbellRow key={row.key} actions={actionsFor(row)} row={row} ticks={domain.ticks} />
          ))}
        </ul>
      </section>
    </li>
  );
}

function DomainList({
  domains,
  actionsFor,
}: {
  domains: DomainSectionModel[];
  actionsFor: RowActions;
}) {
  return (
    <ul className="divide-analysis-border/60 divide-y">
      {domains.map((domain) => (
        <DomainSection key={domain.outcome} actionsFor={actionsFor} domain={domain} />
      ))}
    </ul>
  );
}

function PolarityBand({
  title,
  description,
  domains,
  actionsFor,
  empty,
}: {
  title: string;
  description: string;
  domains: DomainSectionModel[];
  actionsFor: RowActions;
  empty: string;
}) {
  const titleId = useId();
  return (
    <FadeIn>
      <section aria-labelledby={titleId} className="space-y-2">
        <div className="space-y-0.5 px-0.5">
          <h3 className="text-sm font-medium" id={titleId}>
            {title}
          </h3>
          <p className="text-muted-foreground text-xs text-pretty">{description}</p>
        </div>
        <div className="analysis-panel overflow-hidden">
          {domains.length > 0 ? (
            <DomainList actionsFor={actionsFor} domains={domains} />
          ) : (
            <p className="text-muted-foreground px-3 py-4 text-sm text-pretty">{empty}</p>
          )}
        </div>
      </section>
    </FadeIn>
  );
}

function WeakLeadsFooter({
  vm,
  actionsFor,
}: {
  vm: JournalAnalysesViewModel;
  actionsFor: RowActions;
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const noun = vm.weakCount > 1 ? 'pistes' : 'piste';

  return (
    <div className="analysis-panel overflow-hidden">
      <button
        aria-controls={detailId}
        aria-expanded={open}
        className="focus-visible:ring-ring/50 flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-start text-sm outline-none focus-visible:ring-2"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 flex-1 text-pretty">
          <span className="text-data">{vm.weakCount}</span> {noun} à confirmer ·{' '}
          <span className="text-muted-foreground">{vm.weakLabels.join(' · ')}</span>
        </span>
        <ChevronDown
          className={cn(
            'text-muted-foreground size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <MotionExpand id={detailId} open={open}>
        <p className="text-muted-foreground px-3 pb-2 text-xs text-pretty">
          Échantillon court ou écart juste au seuil : à surveiller, pas à conclure.
        </p>
        <DomainList actionsFor={actionsFor} domains={vm.weakDomains} />
      </MotionExpand>
    </div>
  );
}

function AssociationBands({
  vm,
  actionsFor,
}: {
  vm: JournalAnalysesViewModel;
  actionsFor: RowActions;
}) {
  return (
    <>
      <PolarityBand
        actionsFor={actionsFor}
        description="Habitudes associées à un sommeil ou une récupération plus bas."
        domains={vm.dragDomains}
        empty="Aucune association nette dans ce sens pour l’instant."
        title="Ce qui freine"
      />
      <PolarityBand
        actionsFor={actionsFor}
        description="Habitudes associées à un sommeil ou une récupération plus haut."
        domains={vm.liftDomains}
        empty="Rien de net dans le bon sens pour l’instant. Les freins restent le premier levier."
        title="Ce qui aide"
      />
    </>
  );
}

export function AssociationPanel({
  vm,
  actionsFor,
  className,
}: {
  vm: JournalAnalysesViewModel;
  actionsFor: RowActions;
  className?: string;
}) {
  const titleId = useId();
  const hasNet = vm.dragDomains.length > 0 || vm.liftDomains.length > 0;

  return (
    <section aria-labelledby={titleId} className={cn('space-y-6', className)}>
      <div className="space-y-1.5 px-0.5">
        <h2 className="text-section-title" id={titleId}>
          Ce que disent tes données
        </h2>
        <Legend />
      </div>

      {!hasNet ? (
        <div className="analysis-panel">
          <p className="text-muted-foreground px-3 py-4 text-sm text-pretty">
            Aucune association nette pour l’instant : il faut assez de jours avec et sans
            l’habitude, et un écart net.
          </p>
        </div>
      ) : (
        <AssociationBands actionsFor={actionsFor} vm={vm} />
      )}

      {vm.weakCount > 0 ? <WeakLeadsFooter actionsFor={actionsFor} vm={vm} /> : null}
    </section>
  );
}
