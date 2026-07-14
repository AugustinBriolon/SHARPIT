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
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Profil
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Mon identité sportive</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Seuils, zones et préférences physiologiques — tout ce que SHARPIT utilise pour
          personnaliser le coaching et le planning.
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
