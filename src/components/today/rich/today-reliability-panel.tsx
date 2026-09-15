'use client';

import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { LinkButton } from '@/components/ui/link-button';
import { ExpertOnly } from '@/components/display-mode';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { buildPourquoiAthleteCopy } from '@/lib/presentation/today/pourquoi-athlete';
import { cn } from '@/lib/utils';

type Reliability = NonNullable<TodayViewModel['hero']['reliability']>;

function EstimationChip({ label }: { label: string }) {
  return (
    <span className="border-ink-surface-foreground/25 text-ink-surface-foreground/80 mt-3 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
      {label}
    </span>
  );
}

function VisibleGaps({ gaps }: { gaps: readonly string[] }) {
  if (gaps.length === 0) {
    return null;
  }
  return (
    <ul className="text-ink-surface-foreground/70 mt-3 space-y-1 text-xs leading-snug">
      {gaps.slice(0, 2).map((gap) => (
        <li key={gap}>· {gap}</li>
      ))}
    </ul>
  );
}

function AthletePourquoiBody({ sentences }: { sentences: readonly string[] }) {
  return (
    <div className="text-ink-surface-foreground/80 space-y-3 text-sm leading-relaxed">
      {sentences.map((sentence) => (
        <p key={sentence}>{sentence}</p>
      ))}
    </div>
  );
}

/** Technical dump — Mode Expert only (ages, series, rationale codes). */
function ExpertProvenanceBody({ provenance }: { provenance: Reliability['provenance'] }) {
  return (
    <div className="text-ink-surface-foreground/80 border-ink-surface-foreground/15 mt-3 space-y-3 border-t pt-3 text-xs leading-relaxed">
      <p className="text-ink-surface-foreground/65 font-medium tracking-wide uppercase">
        Mode Expert
      </p>
      <ul className="space-y-1.5">
        {provenance.series.map((line) => (
          <li key={line.key} className="flex flex-col gap-0.5">
            <span className="font-medium">{line.label}</span>
            <span className="text-ink-surface-foreground/65">{line.detail}</span>
          </li>
        ))}
      </ul>
      <p>{provenance.goalVsJournalWeight}</p>
      {provenance.rationaleLabels.length > 0 ? (
        <div className="space-y-1">
          <p className="font-medium">Codes de décision</p>
          <ul className="space-y-0.5">
            {provenance.rationaleLabels.map((label, index) => (
              <li key={`${provenance.rationaleCodes[index]}-${label}`}>{label}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function TodayReliabilityPanel({
  reliability,
  loading,
}: {
  reliability: Reliability | null | undefined;
  loading?: boolean;
}) {
  if (loading || !reliability) {
    return null;
  }

  const journalWeighted = reliability.provenance.series.some(
    (line) => line.key === 'journal' && line.status === 'ok',
  );
  const athlete = buildPourquoiAthleteCopy({
    softHero: reliability.softHero,
    packTier: reliability.packTier,
    visibleGaps: reliability.visibleGaps,
    journalWeighted,
  });

  return (
    <div className="mt-5">
      {reliability.estimationChip ? (
        <EstimationChip label={reliability.estimationChip} />
      ) : null}
      {reliability.softHero ? <VisibleGaps gaps={athlete.gapBullets} /> : null}
      {reliability.ctaCompleteSources ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/settings/integrations" size="sm" variant="secondary">
            Compléter les sources
          </LinkButton>
          <LinkButton href="/aujourd-hui" size="sm" variant="ghost">
            Attendre la sync
          </LinkButton>
        </div>
      ) : null}
      <div
        className={cn(
          'border-ink-surface-foreground/15 mt-4 rounded-md border px-3',
          '[&_summary]:text-ink-surface-foreground/85',
          '[&_.text-foreground\\/85]:text-ink-surface-foreground/85',
          '[&_.text-muted-foreground\\/70]:text-ink-surface-foreground/60',
          '[&_.text-data]:text-ink-surface-foreground/65',
        )}
      >
        <CollapsibleSection
          label="Pourquoi"
          summary={athlete.summary}
          defaultOpen={false}
        >
          <AthletePourquoiBody sentences={athlete.sentences} />
          <ExpertOnly>
            <ExpertProvenanceBody provenance={reliability.provenance} />
          </ExpertOnly>
        </CollapsibleSection>
      </div>
    </div>
  );
}
