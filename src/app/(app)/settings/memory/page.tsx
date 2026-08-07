import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { CoachMemoryManager } from '@/components/coach-memory/coach-memory-manager';

export default async function SettingsCoachMemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;

  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Contexte coach</p>
        <h1 className="text-page-title mt-1">Mémoire du coach</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Deux couches : préférences durables, puis contraintes datées. Le coach s&apos;en sert pour
          contextualiser chat, semaine et adaptation.
        </p>
      </StickyHeader>

      <CoachMemoryManager focusId={focus ?? null} />
    </div>
  );
}
