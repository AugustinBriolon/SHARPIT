/**
 * Motion tokens — motion-foundations + DESIGN_LANGUAGE §9.
 * Hard cap: nothing exceeds 300ms (0.3s).
 * Springs: snappy/gentle/instant for UI; release reserved for future drag.
 * Never use bouncy springs on production chrome.
 */
export const motionTokens = {
  duration: {
    /** Tooltip / badge / focus — DESIGN_LANGUAGE micro 150ms */
    instant: 0.08,
    fast: 0.15,
    /** Expand / section enter — standard 250ms */
    normal: 0.25,
    /** Page / hero — max 300ms */
    slow: 0.3,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    sharp: [0.4, 0, 0.2, 1] as [number, number, number, number],
    linear: [0, 0, 1, 1] as [number, number, number, number],
  },
  distance: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  scale: {
    subtle: 0.98,
    /** better-ui / SHARPIT press — always 0.96, never below 0.95 */
    press: 0.96,
    pop: 1.02,
  },
  stagger: {
    /** motion-patterns: keep between 0.05–0.10 */
    children: 0.08,
    delayChildren: 0.06,
  },
} as const;

export const springs = {
  snappy: { type: 'spring' as const, stiffness: 300, damping: 30, bounce: 0 },
  gentle: { type: 'spring' as const, stiffness: 160, damping: 22, bounce: 0 },
  instant: { type: 'spring' as const, stiffness: 600, damping: 35, bounce: 0 },
  /** Drag release — physics feel; not for discrete UI toggles */
  release: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 20,
    restDelta: 0.001,
    bounce: 0,
  },
};
