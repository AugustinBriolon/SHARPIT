import Link from 'next/link';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
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
  if (a.includes(v) || v.includes(a.replace(/\s+/g, ' '))) return true;
  const vTokens = new Set(v.split(' ').filter((t) => t.length > 2));
  const aTokens = a.split(' ').filter((t) => t.length > 2);
  const overlap = aTokens.filter((t) => vTokens.has(t)).length;
  return overlap >= Math.min(vTokens.size, 2) && aTokens.length <= vTokens.size + 1;
}

/**
 * Why band — same DNA as TodayWhyBlock: primary line, rest in expand, ghost Accueil.
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

  const primary = action ?? headline;
  const expandLines = [action && headline ? headline : null, context.relationNote].filter(
    (line): line is string => Boolean(line),
  );

  return (
    <section className="px-0.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-label">Décision du jour</p>
        <Link
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          href={context.todayHref}
        >
          Aujourd&apos;hui
          <span className="text-data tracking-wider" aria-hidden>
            →
          </span>
        </Link>
      </div>

      <p className={cn('text-sm leading-relaxed', context.verdictClassName)}>
        <span className="font-medium">{context.verdictLabel}</span>
        {primary ? (
          <span className="text-foreground font-normal">
            {' — '}
            {primary}
          </span>
        ) : null}
      </p>

      {expandLines.length > 0 ? (
        <details className="group mt-2">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">
              {expandLines.length === 1 ? 'Voir le détail' : `Voir ${expandLines.length} détails`}
            </span>
          </summary>
          <ul className="text-muted-foreground mt-1 space-y-1.5 text-sm leading-relaxed">
            {expandLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
