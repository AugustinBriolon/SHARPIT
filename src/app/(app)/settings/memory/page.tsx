import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { CoachMemoryManager } from '@/components/coach-memory/coach-memory-manager';

async function CoachMemoryManagerForFocus({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  return <CoachMemoryManager focusId={focus ?? null} />;
}

export const instant = true;

export default function SettingsCoachMemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />

      {/* Identity lives in the ink band inside the manager — no page header here.
          `?focus=` is only known at request time, so the manager streams. */}
      <Suspense>
        <CoachMemoryManagerForFocus searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
