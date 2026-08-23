import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import { navPillClass } from '@/lib/ui/nav-pill';

const TAB_LABELS = ['Objectifs', 'Performance', 'Corps & santé'];

/** Stable Progression chrome for Suspense fallback — default Objectifs tab, no search params. */
export function ProgressHubSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <StickyHeader>
        <p className="text-label">Progression</p>
        <h1 className="text-page-title mt-1">Objectifs</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ce vers quoi tu construis — courses, échéances et repères.
        </p>

        <nav
          aria-label="Sections Progression"
          className="-mx-1 mt-4 flex scrollbar-none gap-1.5 overflow-x-auto pb-0.5"
        >
          {TAB_LABELS.map((label, index) => (
            <span key={label} className={navPillClass(index === 0)}>
              {label}
            </span>
          ))}
        </nav>
      </StickyHeader>

      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
