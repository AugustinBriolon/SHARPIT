import { MobileBackLink } from '@/components/layout/header/mobile-back-link';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import {
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';
import { MOI_HUB_PATH } from '@/lib/moi/paths';

export default function SettingsAccountLoading() {
  return (
    <div className="space-y-4">
      <MobileBackLink fallbackHref={MOI_HUB_PATH} fallbackLabel="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">Profil</h1>
        <p className="text-muted-foreground mt-1 text-sm">Identité, rythme de vie et connexion.</p>
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
