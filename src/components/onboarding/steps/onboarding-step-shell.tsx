'use client';

import { useOnboardingStepProgress } from '@/components/onboarding/steps/onboarding-step-progress-context';
import { OnboardingStepProgressRail } from '@/components/onboarding/steps/onboarding-step-progress-rail';
import { DockedActionBar } from '@/components/ui/docked-action-bar';
import { cn } from '@/lib/utils';

/**
 * Shared anatomy for every wizard step: sticky progress, content, docked actions.
 *
 * The progress rail is a *direct* child of this section on purpose. `position:
 * sticky` is clamped to its parent's box — nest it with the title in a short
 * wrapper and it unsticks as soon as that wrapper leaves the viewport (the
 * providers step made that obvious). Here the parent is the full step, so the
 * rail stays put for the whole scroll.
 *
 * `pt-3` keeps air under the viewport edge once stuck. The rail bleeds to the
 * layout gutter (`-mx-6 px-6`) so content scrolls under an opaque band.
 *
 * Height still comes from the flex column in `app/onboarding/layout.tsx` — no
 * viewport arithmetic here, so the page keeps scr¨olling naturally when a mobile
 * keyboard opens.
 */
export function OnboardingStepShell({
  titleId,
  title,
  intro,
  error,
  actions,
  docksOwnActions = false,
  children,
}: {
  titleId: string;
  title: string;
  intro: string;
  error?: string | null;
  /** Forward actions, right-aligned from `sm`. Omit when the content owns them. */
  actions?: React.ReactNode;
  /** Content renders its own `DockedActionBar` — reserve room for it all the same. */
  docksOwnActions?: boolean;
  children: React.ReactNode;
}) {
  const progress = useOnboardingStepProgress();
  const reservesBarSpace = Boolean(actions) || docksOwnActions;

  return (
    <section aria-labelledby={titleId} className="flex min-h-0 flex-1 flex-col">
      {progress ? <OnboardingStepProgressRail progress={progress} /> : null}

      <header className={cn('space-y-1', progress ? 'mt-4' : undefined)}>
        <h1 className="text-page-title text-balance" id={titleId}>
          {title}
        </h1>
        <p className="text-muted-foreground text-sm text-pretty">{intro}</p>
      </header>

      {/* Reserve the bar's worst case — two stacked h-11 buttons plus padding
          and the safe area — or the last control scrolls underneath it. */}
      <div className={cn('mt-5 flex-1 space-y-5', reservesBarSpace && 'max-sm:pb-40')}>
        {children}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {actions ? <DockedActionBar>{actions}</DockedActionBar> : null}
    </section>
  );
}
