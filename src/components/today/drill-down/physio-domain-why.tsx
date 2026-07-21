import Link from 'next/link';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Domain-first why — global training decision demoted to expand.
 * Same DNA as SleepWhyBlock / TodayWhyBlock.
 */
export function PhysioDomainWhy({
  label,
  primary,
  primaryClassName,
  supportingLines = [],
  globalDecision,
  loading = false,
}: {
  label: string;
  primary: string | null;
  primaryClassName?: string;
  supportingLines?: string[];
  globalDecision: GlobalDecisionContext;
  loading?: boolean;
}) {
  const hasSupport = !loading && supportingLines.length > 0;
  const hasGlobal = !loading && globalDecision.visible;

  if (!loading && !primary && !hasSupport && !hasGlobal) return null;

  return (
    <section aria-busy={loading || undefined} className="px-0.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-label">{label}</p>
        {hasGlobal ? (
          <Link
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
            href={globalDecision.todayHref}
          >
            Aujourd&apos;hui
            <span className="text-data tracking-wider" aria-hidden>
              →
            </span>
          </Link>
        ) : loading ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            Aujourd&apos;hui
            <span className="text-data tracking-wider" aria-hidden>
              →
            </span>
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full max-w-xl rounded-full" />
          <Skeleton className="h-4 w-[85%] max-w-md rounded-full" />
        </div>
      ) : primary ? (
        <p className={cn('text-sm leading-relaxed', primaryClassName ?? 'text-foreground')}>
          {primary}
        </p>
      ) : null}

      {hasSupport ? (
        <details className={cn('group', primary ? 'mt-2' : undefined)}>
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">
              {supportingLines.length === 1
                ? 'Voir le détail'
                : `Voir ${supportingLines.length} autres points`}
            </span>
          </summary>
          <ul className="text-muted-foreground mt-1 space-y-1.5 text-sm leading-relaxed">
            {supportingLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ) : loading ? (
        <p className="text-muted-foreground mt-2 text-xs font-medium tracking-wide opacity-60">
          Voir le détail
        </p>
      ) : null}

      {hasGlobal ? (
        <details className={cn('group', primary || hasSupport ? 'mt-2' : undefined)}>
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">
              Décision du jour
              {globalDecision.verdictLabel ? ` · ${globalDecision.verdictLabel}` : ''}
            </span>
          </summary>
          <p
            className={cn(
              'mt-1 text-sm leading-relaxed font-medium',
              globalDecision.verdictClassName,
            )}
          >
            {globalDecision.verdictLabel}
            {globalDecision.topActionLine ? (
              <span className="text-foreground font-normal">
                {' — '}
                {globalDecision.topActionLine}
              </span>
            ) : null}
          </p>
          {globalDecision.relationNote ? (
            <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
              {globalDecision.relationNote}
            </p>
          ) : null}
        </details>
      ) : loading ? (
        <p className="text-muted-foreground mt-2 text-xs font-medium tracking-wide opacity-60">
          Décision du jour
        </p>
      ) : null}
    </section>
  );
}
