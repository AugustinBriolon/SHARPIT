import Link from 'next/link';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { cn } from '@/lib/utils';

export function GlobalDecisionStrip({ context }: { context: GlobalDecisionContext }) {
  if (!context.visible) return null;

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Décision produit du jour</DrillDownSectionLabel>
      <p className={cn('text-lg font-semibold', context.verdictClassName)}>
        {context.verdictLabel}
      </p>
      {context.headline ? (
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{context.headline}</p>
      ) : null}
      {context.topActionLine ? (
        <p className="text-foreground mt-2 text-sm font-medium">{context.topActionLine}</p>
      ) : null}
      {context.relationNote ? (
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{context.relationNote}</p>
      ) : null}
      <Link
        className="text-primary mt-3 inline-block text-xs font-medium underline-offset-2 hover:underline"
        href={context.todayHref}
      >
        Voir Accueil
      </Link>
    </DrillDownSectionCard>
  );
}
