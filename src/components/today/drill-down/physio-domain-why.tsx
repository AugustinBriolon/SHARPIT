import Link from 'next/link';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
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
}: {
  label: string;
  primary: string | null;
  primaryClassName?: string;
  supportingLines?: string[];
  globalDecision: GlobalDecisionContext;
}) {
  const hasSupport = supportingLines.length > 0;
  const hasGlobal = globalDecision.visible;

  if (!primary && !hasSupport && !hasGlobal) return null;

  return (
    <></>
    // <section className="px-0.5">
    //   <div className="mb-2 flex items-center justify-between gap-3">
    //     <p className="text-label">{label}</p>
    //     {hasGlobal ? (
    //       <Link
    //         className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
    //         href={globalDecision.todayHref}
    //       >
    //         Aujourd&apos;hui
    //         <span className="text-data tracking-wider" aria-hidden>
    //           →
    //         </span>
    //       </Link>
    //     ) : null}
    //   </div>

    //   {primary ? (
    //     <p className={cn('text-sm leading-relaxed', primaryClassName ?? 'text-foreground')}>
    //       {primary}
    //     </p>
    //   ) : null}

    //   {hasSupport ? (
    //     <details className={cn('group', primary ? 'mt-2' : undefined)}>
    //       <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
    //         <span className="underline-offset-2 group-open:no-underline">
    //           {supportingLines.length === 1
    //             ? 'Voir le détail'
    //             : `Voir ${supportingLines.length} autres points`}
    //         </span>
    //       </summary>
    //       <ul className="text-muted-foreground mt-1 space-y-1.5 text-sm leading-relaxed">
    //         {supportingLines.map((line) => (
    //           <li key={line}>{line}</li>
    //         ))}
    //       </ul>
    //     </details>
    //   ) : null}

    //   {hasGlobal ? (
    //     <details className={cn('group', primary || hasSupport ? 'mt-2' : undefined)}>
    //       <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
    //         <span className="underline-offset-2 group-open:no-underline">
    //           Décision du jour
    //           {globalDecision.verdictLabel ? ` · ${globalDecision.verdictLabel}` : ''}
    //         </span>
    //       </summary>
    //       <p
    //         className={cn(
    //           'mt-1 text-sm leading-relaxed font-medium',
    //           globalDecision.verdictClassName,
    //         )}
    //       >
    //         {globalDecision.verdictLabel}
    //         {globalDecision.topActionLine ? (
    //           <span className="text-foreground font-normal">
    //             {' — '}
    //             {globalDecision.topActionLine}
    //           </span>
    //         ) : null}
    //       </p>
    //       {globalDecision.relationNote ? (
    //         <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
    //           {globalDecision.relationNote}
    //         </p>
    //       ) : null}
    //     </details>
    //   ) : null}
    // </section>
  );
}
