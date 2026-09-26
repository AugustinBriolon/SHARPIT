'use client';

import { LinkButton } from '@/components/ui/link-button';
import type { TodayViewModel } from '@/presentation/today-view-model';

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
        <li key={gap}>· {gap.replace(/[—–]/g, '-')}</li>
      ))}
    </ul>
  );
}

/**
 * Soft-hero reliability under the Today verdict: chip + gap bullets + source CTAs.
 * No « Pourquoi » collapsible (Design hotfix).
 */
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

  return (
    <div className="mt-5">
      {reliability.estimationChip ? <EstimationChip label={reliability.estimationChip} /> : null}
      {reliability.softHero ? <VisibleGaps gaps={reliability.visibleGaps} /> : null}
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
    </div>
  );
}
