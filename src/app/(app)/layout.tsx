import { Suspense } from 'react';
import { AthleteStateInitializer } from '@/components/athlete-state/athlete-state-initializer';
import { AccessGate } from '@/components/auth/access-gate';
import { AppShell } from '@/components/layout/app-shell';
import { NavStackTracker } from '@/components/layout/nav-stack-tracker';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AthleteStateInitializer />
      {/* Reads the URL and renders nothing — no fallback needed. */}
      <Suspense>
        <NavStackTracker />
      </Suspense>
      <AppShell>{children}</AppShell>
      {/* Awaits Clerk at request time, alongside the shell rather than above it,
          so the chrome and every page below still prerender. */}
      <Suspense>
        <AccessGate />
      </Suspense>
    </>
  );
}
