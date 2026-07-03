export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted h-72 rounded-2xl" />
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
        <p className="text-[10px] font-semibold text-slate-500 uppercase dark:text-slate-400">
          Prochaines séances
        </p>
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
