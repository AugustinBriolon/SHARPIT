'use client';

import type { TodayViewModel } from '@/core/presentation/today-view-model';

function factSentence(fact: { label: string; value: string; hint?: string | null }): string {
  if (fact.hint) return `${fact.value} — ${fact.hint}`;
  return fact.value;
}

/**
 * Evidence block — primary finding as a short narrative; remainder behind expand.
 */
export function TodayWhyBlock({ vm }: { vm: TodayViewModel }) {
  const { facts } = vm.whyBlock;
  if (!vm.whyBlock.visible || facts.length === 0) return null;

  const [primary, ...rest] = facts;

  return (
    <section className="px-0.5">
      <p className="text-label mb-2">{vm.whyBlock.title}</p>
      <p className="text-foreground text-sm leading-relaxed">{factSentence(primary)}</p>
      {rest.length > 0 && (
        <details className="group mt-2">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">
              {rest.length === 1 ? 'Voir le détail' : `Voir ${rest.length} autres signaux`}
            </span>
          </summary>
          <ul className="text-muted-foreground mt-1 space-y-1.5 text-sm leading-relaxed">
            {rest.map((fact) => (
              <li key={`${fact.label}-${fact.value}`}>{factSentence(fact)}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
