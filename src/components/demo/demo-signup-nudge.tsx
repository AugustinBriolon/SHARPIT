import { LinkButton } from '@/components/ui/link-button';

/**
 * One tasteful, contextual sign-up nudge — placed right after a screen that
 * just showed real product value (not a banner that nags on every page).
 */
export function DemoSignupNudge({ label }: { label: string }) {
  return (
    <div className="chip-surface rounded-analysis flex flex-wrap items-center justify-between gap-3 px-3.5 py-3">
      <p className="text-muted-foreground text-sm leading-relaxed">{label}</p>
      <LinkButton className="shrink-0" href="/sign-up" size="sm" variant="outline">
        Créer un compte
      </LinkButton>
    </div>
  );
}
