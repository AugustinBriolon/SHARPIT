import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';

const SECTION_LABELS = ['Objectifs', 'Performance', 'Corps & santé'] as const;

/** Stable Progression chrome for Suspense fallback. */
export function ProgressHubSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <StickyHeader>
        <h1 className="text-page-title">Progression</h1>

        <nav
          aria-label="Sections Progression"
          className="border-analysis-border/70 mt-4 flex gap-5 border-b"
        >
          {SECTION_LABELS.map((label, index) => (
            <span
              key={label}
              className={
                index === 0
                  ? 'border-foreground -mb-px min-h-11 border-b-2 px-0 text-sm font-medium lg:min-h-9'
                  : 'text-muted-foreground -mb-px min-h-11 border-b-2 border-transparent px-0 text-sm lg:min-h-9'
              }
            >
              {label}
            </span>
          ))}
        </nav>
      </StickyHeader>

      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
