import Link from 'next/link';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { cn } from '@/lib/utils';

function normalizePhrase(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** True when action is basically the same slogan as the verdict. */
function isRedundantAction(verdict: string, action: string): boolean {
  const v = normalizePhrase(verdict);
  const a = normalizePhrase(action);
  if (!v || !a) return true;
  if (a === v) return true;
  // "entraine toi legerement" vs "entraine toi legerement" / "entraine toi — legerement"
  if (a.includes(v) || v.includes(a.replace(/\s+/g, ' '))) return true;
  const vTokens = new Set(v.split(' ').filter((t) => t.length > 2));
  const aTokens = a.split(' ').filter((t) => t.length > 2);
  const overlap = aTokens.filter((t) => vTokens.has(t)).length;
  return overlap >= Math.min(vTokens.size, 2) && aTokens.length <= vTokens.size + 1;
}

/**
 * Product-level decision — one verdict, optional distinct action, role note.
 * Never repeats the same phrase three times.
 */
export function GlobalDecisionStrip({ context }: { context: GlobalDecisionContext }) {
  if (!context.visible) return null;

  const action =
    context.topActionLine && !isRedundantAction(context.verdictLabel, context.topActionLine)
      ? context.topActionLine
      : null;

  const headline =
    context.headline &&
    !isRedundantAction(context.verdictLabel, context.headline) &&
    (!action || !isRedundantAction(action, context.headline))
      ? context.headline
      : null;

  return (
    <DrillDownSectionCard>
      <div className="flex items-baseline justify-between gap-3">
        <DrillDownSectionLabel className="mb-0">Décision du jour</DrillDownSectionLabel>
        <Link className="explore-link" href={context.todayHref}>
          Accueil
        </Link>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        <p className={cn('text-base leading-snug font-semibold', context.verdictClassName)}>
          {context.verdictLabel}
        </p>
      </div>

      {action ? (
        <p className="text-foreground mt-2 text-sm leading-snug font-medium">{action}</p>
      ) : null}

      {headline ? (
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{headline}</p>
      ) : null}

      {context.relationNote ? (
        <p className="annotation-clinical mt-3">{context.relationNote}</p>
      ) : null}
    </DrillDownSectionCard>
  );
}
