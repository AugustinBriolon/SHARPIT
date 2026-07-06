import { Skeleton } from '@/components/ui/skeleton';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';

function MetricRingSkeleton() {
  return (
    <div className="flex flex-col items-center rounded-2xl px-2 py-3 sm:px-3 sm:py-4">
      <Skeleton className="m-1 size-[72px] rounded-full sm:size-[80px]" />
      <Skeleton className="mt-2 h-3.5 w-16" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <MetricRingSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-3">
          <div className="bg-muted h-48 rounded-2xl" />
          <div className="bg-muted h-68.5 rounded-2xl" />
        </div>
        <div className="bg-muted h-120 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-muted h-69 rounded-2xl" />
        <div className="bg-muted h-69 rounded-2xl" />
      </div>
      <div className="space-y-3">
        <EyebrowLabel variant="dashboard">Prochaines séances</EyebrowLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-muted h-31 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function InsufficientDataState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="max-w-xs text-sm text-slate-500">
        Pas encore de données physiologiques pour aujourd&apos;hui. Synchronise tes appareils pour
        obtenir ton bilan.
      </p>
      <button
        className="text-xs text-slate-400 underline-offset-4 transition-colors hover:text-slate-600 hover:underline"
        type="button"
        onClick={onRetry}
      >
        Réessayer
      </button>
    </div>
  );
}
