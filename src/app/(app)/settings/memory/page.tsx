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
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">Mémoire du coach</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Consulte, modifie ou supprime ce que SHARPIT retient pour contextualiser le coaching —
          préférences personnelles, déplacements et entrées structurées.
        </p>
      </StickyHeader>

      <CoachMemoryManager focusId={focus ?? null} />
    </div>
  );
}
