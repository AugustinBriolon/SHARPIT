'use client';

import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { Skeleton } from '@/components/ui/skeleton';

function factSentence(fact: { label: string; value: string; hint?: string | null }): string {
  if (fact.hint) {
    return `${fact.value} — ${fact.hint}`;
  }
  return fact.value;
}

function TodayWhyBlockLoading({ title }: { title: string }) {
  return (
    <section className="px-0.5" aria-busy>
      <p className="text-label mb-2">{title}</p>
      <div className="space-y-2">
        <Skeleton className="h-4 w-[92%] max-w-xl rounded-full" />
        <Skeleton className="h-4 w-[64%] max-w-md rounded-full" />
      </div>
      <p className="text-muted-foreground mt-2 text-xs font-medium tracking-wide opacity-60">
        Voir le détail
      </p>
    </section>
  );
}

function TodayWhyBlockRest({ facts }: { facts: TodayViewModel['whyBlock']['facts'] }) {
  if (facts.length === 0) {
    return null;
  }
  return (
    <details className="group mt-2">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
        <span className="underline-offset-2 group-open:no-underline">
          {facts.length === 1 ? 'Voir le détail' : `Voir ${facts.length} autres signaux`}
        </span>
      </summary>
      <ul className="text-muted-foreground mt-1 space-y-1.5 text-sm leading-relaxed">
        {facts.map((fact) => (
          <li key={`${fact.label}-${fact.value}`}>
            <span className="text-foreground/85 font-medium">{fact.label}</span>
            {' · '}
            {factSentence(fact)}
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Evidence block — primary finding as a short narrative; remainder behind expand.
 * Mounted under the verdict (outside the ink plate) when whyBlock.visible.
 */
export function TodayWhyBlock({ vm, loading = false }: { vm: TodayViewModel; loading?: boolean }) {
  if (loading) {
    return <TodayWhyBlockLoading title={vm.whyBlock.title} />;
  }

  const { facts } = vm.whyBlock;
  if (!vm.whyBlock.visible || facts.length === 0) {
    return null;
  }

  const [primary, ...rest] = facts;

  return (
    <section aria-label={vm.whyBlock.title} className="px-0.5">
      <p className="text-label mb-2">{vm.whyBlock.title}</p>
      <p className="text-foreground text-sm leading-relaxed">
        <span className="text-foreground/85 font-medium">{primary.label}</span>
        {' · '}
        {factSentence(primary)}
      </p>
      <TodayWhyBlockRest facts={rest} />
    </section>
  );
}
