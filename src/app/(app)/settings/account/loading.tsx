import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import {
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';

export default function SettingsAccountLoading() {
  return (
    <div className="space-y-4">
      <MobileBackLink showOnDesktop />
      <StickyHeader>
        <p className="text-label">Profil</p>
        <h1 className="text-page-title mt-1">Mon profil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Identité et rythme de vie — les repères de performance sont dans Progression.
        </p>
      </StickyHeader>

      <SkeletonCard className="space-y-3">
        <SkeletonEyebrow />
        <SkeletonTitle size="md" />
        <SkeletonText />
      </SkeletonCard>

      <SkeletonCard className="space-y-3">
        <SkeletonEyebrow />
        <SkeletonText widths={['100%', '84%', '60%', '72%']} />
      </SkeletonCard>
    </div>
  );
}
