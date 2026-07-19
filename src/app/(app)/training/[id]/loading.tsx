import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonAnalysisPanelAlt,
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonInsightSection,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';

export default function Loading() {
  return (
    <div className="relative z-0 space-y-8">
      <MobileBackLink href="/training/history" label="Activités" showOnDesktop />

      <StickyHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 shrink-0 rounded-2xl" />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-full border-0" />
                <Skeleton className="h-3 w-20 rounded-full border-0" />
              </div>
              <Skeleton className="h-9 w-72 max-w-full rounded-full border-0" />
              <div className="flex gap-3">
                <Skeleton className="h-4 w-16 rounded-full border-0" />
                <Skeleton className="h-4 w-20 rounded-full border-0" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </StickyHeader>

      <div className="relative z-0 space-y-5">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>

        <SkeletonAnalysisPanelAlt>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 shrink-0 rounded-sm" />
              <p className="text-label">Analyse coach</p>
            </div>
            <Skeleton className="h-3 w-36 rounded-full border-0" />
          </div>
          <SkeletonTitle className="mt-5" size="md" />
          <SkeletonText className="mt-3" widths={['100%', '92%', '78%']} />
        </SkeletonAnalysisPanelAlt>

        <Skeleton className="rounded-analysis-lg h-80 w-full sm:h-96" />
      </div>

      <section className="space-y-3">
        <SkeletonEyebrow className="w-28" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} className="min-h-28 px-4 py-4">
              <Skeleton className="h-3 w-20 rounded-full border-0" />
              <Skeleton className="mt-3 h-7 w-16 border-0" />
            </SkeletonCard>
          ))}
        </div>
      </section>

      <SkeletonCard className="min-h-56 px-5 py-5">
        <SkeletonEyebrow className="w-20" />
        <Skeleton className="rounded-analysis mt-4 h-40 w-full border-0" />
      </SkeletonCard>

      <section className="space-y-4">
        <SkeletonEyebrow className="w-20" />
        <SkeletonCard className="min-h-64 px-5 py-5">
          <Skeleton className="rounded-analysis h-56 w-full border-0" />
        </SkeletonCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard className="min-h-48 px-5 py-5">
            <Skeleton className="rounded-analysis h-40 w-full border-0" />
          </SkeletonCard>
          <SkeletonCard className="min-h-48 px-5 py-5">
            <Skeleton className="rounded-analysis h-40 w-full border-0" />
          </SkeletonCard>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonInsightSection blocks={2} className="lg:col-span-2" />
        <SkeletonCard className="min-h-32 px-5 py-5">
          <SkeletonEyebrow className="w-24" />
          <SkeletonText className="mt-4" widths={['100%', '82%']} />
        </SkeletonCard>
      </div>
    </div>
  );
}
