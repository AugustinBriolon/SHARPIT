import { MobileBackLink } from '@/components/layout/mobile-back-link';
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

      {/* Identity lives in the ink band inside the manager — no page header here. */}
      <CoachMemoryManager focusId={focus ?? null} />
    </div>
  );
}
