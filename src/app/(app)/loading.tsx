import {
  SkeletonAnalysisPanelAlt,
  SkeletonEyebrow,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';

/** Route-agnostic shell shown while DashboardLayout resolves `currentUser()`, before any route-specific skeleton can mount. */
export default function AppLoading() {
  return (
    <div className="mx-auto space-y-3 sm:space-y-4">
      <SkeletonAnalysisPanelAlt>
        <div className="space-y-2">
          <SkeletonEyebrow />
          <SkeletonTitle size="hero" />
        </div>
      </SkeletonAnalysisPanelAlt>
    </div>
  );
}
