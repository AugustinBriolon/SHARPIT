import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { cn } from '@/lib/utils';

/**
 * Evidence narrative — not a second hero. Title stays body-weight.
 */
export function DrillDownHighlightSection({
  label,
  title,
  titleClassName,
  description,
  bullets = [],
  maxBullets = 3,
}: {
  label: string;
  title: string;
  titleClassName: string;
  description?: string;
  bullets?: string[];
  maxBullets?: number;
}) {
  const [primary, ...rest] = bullets.slice(0, maxBullets);

  return (
    <section className="px-0.5">
      <DrillDownSectionLabel>{label}</DrillDownSectionLabel>
      <p className={cn('mt-2 text-sm leading-relaxed font-medium', titleClassName)}>{title}</p>
      {description ? (
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
      ) : null}
      {primary ? (
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{primary}</p>
      ) : null}
      {rest.length > 0 ? (
        <details className="group mt-2">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">
              {rest.length === 1 ? 'Voir le détail' : `Voir ${rest.length} autres points`}
            </span>
          </summary>
          <ul className="text-muted-foreground mt-1 space-y-1.5 text-sm leading-relaxed">
            {rest.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
