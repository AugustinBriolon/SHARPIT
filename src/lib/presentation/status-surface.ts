/**
 * Shared status surface classes — Seed-aligned success / done washes.
 * Prefer these over raw emerald-* so light/dark stay on brand tokens.
 */
export const STATUS_SURFACE = {
  /** Completed / positive — leaf primary wash */
  done: 'border-primary/30 bg-primary/8 text-primary',
  doneSoft: 'border-primary/25 bg-primary/5',
  doneHover: 'hover:border-primary/45 hover:bg-primary/10',
  /** Badge / chip on success */
  doneBadge: 'border-primary/30 bg-primary/10 text-primary',
  /** Highlight punctuation (Lime) for rare “connected / selected” chips */
  highlightBadge: 'bg-highlight text-highlight-foreground',
} as const;

/**
 * Adequate / maintain / TRAIN_SMART — eucalyptus signal (not consumer Tailwind blue).
 * Positive/go stays `text-primary`; sport swim chips may still use blue identity.
 */
export const ADEQUATE_TONE = {
  colorClass: 'text-[var(--color-signal-recovery)]',
  bgClass: 'bg-[var(--color-signal-recovery)]/12 border-[var(--color-signal-recovery)]/30',
  dotClass: 'bg-[var(--color-signal-recovery)]',
  accentBarClass: 'bg-[var(--color-signal-recovery)]/80',
} as const;

/** Caution / reduced / plateau — Seed signal-caution (not Tailwind amber). */
export const CAUTION_TONE = {
  colorClass: 'text-signal-caution',
  bgClass: 'bg-signal-caution/12 border-signal-caution/30',
  dotClass: 'bg-signal-caution',
  accentBarClass: 'bg-signal-caution/80',
} as const;

/** Elevated concern — signal-vo2 warm band (between caution and risk). */
export const ELEVATED_TONE = {
  colorClass: 'text-signal-vo2',
  bgClass: 'bg-signal-vo2/12 border-signal-vo2/30',
  dotClass: 'bg-signal-vo2',
  accentBarClass: 'bg-signal-vo2/80',
} as const;

/** Risk / critical — Seed signal-risk (not Tailwind red). */
export const RISK_TONE = {
  colorClass: 'text-signal-risk',
  bgClass: 'bg-signal-risk/12 border-signal-risk/30',
  dotClass: 'bg-signal-risk',
  accentBarClass: 'bg-signal-risk/80',
} as const;
