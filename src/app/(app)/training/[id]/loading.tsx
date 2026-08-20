import { InstrumentListChipSkeleton } from '@/components/ui/instruments/instrument-list-chip';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

/** Instant shell while the activity detail RSC resolves. */
export default function ActivityDetailLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement" className="relative z-0 space-y-6 sm:space-y-8">
      <SkeletonDataValue heightClassName="h-4" widthClassName="w-24" />
      <div className="space-y-3">
        <SkeletonDataValue heightClassName="h-8" widthClassName="w-56" />
        <SkeletonDataValue heightClassName="h-4" widthClassName="w-40" />
      </div>
      <div className="flex flex-wrap gap-2">
        <SkeletonDataValue className="rounded-full" heightClassName="h-9" widthClassName="w-28" />
        <SkeletonDataValue className="rounded-full" heightClassName="h-9" widthClassName="w-24" />
        <SkeletonDataValue className="rounded-full" heightClassName="h-9" widthClassName="w-32" />
      </div>
      <InstrumentListChipSkeleton titleWidth="w-48" />
      <InstrumentListChipSkeleton titleWidth="w-36" />
    </div>
  );
}
