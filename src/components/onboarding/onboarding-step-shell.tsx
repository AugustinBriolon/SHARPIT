/**
 * Shared anatomy for every wizard step: left-aligned title block, content,
 * then a sticky action bar. Keeps the back affordance, the reading axis and
 * the action placement identical across the four steps.
 *
 * Height comes from the flex column in `app/onboarding/layout.tsx` — no
 * viewport arithmetic here, so the page still scrolls naturally when a
 * mobile keyboard opens.
 */
export function OnboardingStepShell({
  titleId,
  title,
  intro,
  error,
  actions,
  children,
}: {
  titleId: string;
  title: string;
  intro: string;
  error?: string | null;
  /** Forward actions, right-aligned from `sm`. Omit when the content owns them. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={titleId} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5">
        <header className="space-y-1">
          <h1 className="text-page-title text-balance" id={titleId}>
            {title}
          </h1>
          <p className="text-muted-foreground text-sm text-pretty">{intro}</p>
        </header>

        {children}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="bg-background border-border/60 sticky bottom-0 z-10 mt-5 flex flex-col gap-2 border-t pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
