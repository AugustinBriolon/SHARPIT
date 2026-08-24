import { Suspense } from 'react';
import { AthleteStateInitializer } from '@/components/athlete-state/athlete-state-initializer';
import { AccessGate } from '@/components/auth/access-gate';
import { AppErrorBoundary } from '@/components/error/app-error-boundary';
import { AppShell } from '@/components/layout/app-shell';
import { NavStackTracker } from '@/components/layout/nav-stack-tracker';
import { DemoBanner } from '@/components/demo/demo-banner';
import { DisplayModeProvider } from '@/providers/display-mode-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AthleteStateInitializer />
      {/* Reads the URL and renders nothing — no fallback needed. */}
      <Suspense>
        <NavStackTracker />
      </Suspense>
      {/* Scoped to the page so a failed render keeps the nav and the athlete
          can move elsewhere instead of facing a blank app. */}
      <DisplayModeProvider>
        <AppShell
          demoBanner={
            // Same reasoning as AccessGate below: awaits cookies() at request
            // time without blocking the rest of the shell from prerendering.
            <Suspense>
              <DemoBanner />
            </Suspense>
          }
        >
          <AppErrorBoundary>{children}</AppErrorBoundary>
        </AppShell>
      </DisplayModeProvider>
      {/* Awaits Clerk at request time, alongside the shell rather than above it,
          so the chrome and every page below still prerender. */}
      <Suspense>
        <AccessGate />
      </Suspense>
    </>
  );
}
