import { LinkButton } from '@/components/ui/link-button';
import { cn } from '@/lib/utils';

/**
 * Contextual sign-up nudge — lives inside a coach plate footer, not as a
 * second floating card that breaks the narrative → evidence rhythm.
 */
export function DemoSignupNudge({
  label,
  className,
  embedded = false,
}: {
  label: string;
  className?: string;
  /** When true, no outer plate — parent already provides the surface. */
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        !embedded && 'chip-surface rounded-analysis px-3.5 py-3',
        className,
      )}
    >
      <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-relaxed text-pretty">
        {label}
      </p>
      <LinkButton
        className="shrink-0"
        href="/sign-up"
        size="sm"
        variant={embedded ? 'ghost' : 'outline'}
      >
        Créer un compte
      </LinkButton>
    </div>
  );
}
