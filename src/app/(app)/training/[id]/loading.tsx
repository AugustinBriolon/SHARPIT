import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8">
      {/* Retour mobile */}
      <div className="flex items-center gap-1 lg:hidden">
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Header : icône sport + titre + actions */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 shrink-0 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-9 w-72 max-w-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>

        {/* Chips contexte (RPE / ressenti / météo) */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>

        {/* Stats hero */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Carte */}
      <Skeleton className="h-80 w-full rounded-xl sm:h-96" />

      {/* Performance */}
      <section className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </section>

      {/* Zones (pleine largeur en course à pied) */}
      <Skeleton className="h-56 w-full rounded-xl" />

      {/* Profils / graphiques */}
      <section className="space-y-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </section>

      {/* Caractéristiques / notes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-xl lg:col-span-2" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}
