import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { CoachMemoryManager } from '@/components/coach-memory/coach-memory-manager';
import { CoachMemoryShell } from '@/components/coach-memory/coach-memory-shell';
import { SettingsDemoBlock } from '@/components/settings/settings-demo-block';
import { isDemoSession } from '@/lib/demo/demo-session';

async function CoachMemoryManagerForFocus({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  if (await isDemoSession()) {
    return (
      <SettingsDemoBlock description="La mémoire du coach est un réglage de compte réel. Désactivée sur le compte démo partagé." />
    );
  }

  const { focus } = await searchParams;
  return <CoachMemoryManager focusId={focus ?? null} />;
}

export default function SettingsCoachMemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Profil" showOnDesktop />

      {/* Identity lives in the ink band inside the manager — no page header here.
          `?focus=` is only known at request time, so the manager streams. */}
      <Suspense fallback={<CoachMemoryShell />}>
        <CoachMemoryManagerForFocus searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
