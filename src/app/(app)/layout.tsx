import { Suspense } from 'react';
import { AthleteStateInitializer } from '@/components/athlete-state/athlete-state-initializer';
import { AppErrorBoundary } from '@/components/error/app-error-boundary';
import { AppShell } from '@/components/layout/app-shell';
import { NavStackTracker } from '@/components/layout/nav-stack-tracker';
import { DemoBanner } from '@/components/demo/demo-banner';
import { OnboardingGate } from '@/components/onboarding/onboarding-gate';
import { SignupAccessGate } from '@/components/auth/signup-access-gate';
import { DisplayModeProvider } from '@/providers/display-mode-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AthleteStateInitializer />
      {/* Reads the URL and renders nothing — no fallback needed. */}
      <Suspense>
        <NavStackTracker />
      </Suspense>
      {/* Private-circle gate — blocks unauthorized first-time Clerk sessions. */}
      <Suspense>
        <SignupAccessGate />
      </Suspense>
      {/* First-login redirect — awaits auth/DB without blocking shell prerender. */}
      <Suspense>
        <OnboardingGate />
      </Suspense>
      {/* Scoped to the page so a failed render keeps the nav and the athlete
          can move elsewhere instead of facing a blank app. */}
      <DisplayModeProvider>
        <AppShell
          demoBanner={
            // Awaits cookies() at request time without blocking the rest of the
            // shell from prerendering.
            <Suspense>
              <DemoBanner />
            </Suspense>
          }
        >
          <AppErrorBoundary>{children}</AppErrorBoundary>
        </AppShell>
      </DisplayModeProvider>
    </>
  );
}
