'use client';

/**
 * Primary composition insight — Why step of the instrument column.
 * Lives outside the ink plate so the plate stays one reading (weight).
 */
export function CorpsWhyBandeau({
  hints,
}: {
  hints: ReadonlyArray<{ label: string; text: string }>;
}) {
  if (hints.length === 0) {
    return null;
  }

  const [primary, ...rest] = hints;

  return (
    <aside
      aria-label="Lecture composition"
      className="border-analysis-border/50 bg-analysis-surface/40 rounded-analysis-lg border px-4 py-3"
    >
      <p className="text-sm leading-relaxed">
        <span className="text-foreground font-medium">{primary.label}</span>
        <span className="text-muted-foreground"> : {primary.text}</span>
      </p>
      {rest.length > 0 ? (
        <details className="group mt-2">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">Autres lectures</span>
          </summary>
          <ul className="text-muted-foreground mt-2 space-y-1.5 text-xs leading-relaxed">
            {rest.map(({ label, text }) => (
              <li key={label}>
                <span className="text-foreground/85 font-medium">{label}</span> : {text}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </aside>
  );
}
