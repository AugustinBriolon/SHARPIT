type ProfileThresholds = {
  ftpW?: number | null;
  maxHr?: number | null;
  lthr?: number | null;
  runThresholdPaceSecPerKm?: number | null;
};

export type ProfileCompletenessGap = {
  key: 'thresholds' | 'context';
  label: string;
  href: string;
  cta: string;
};

/** Where athletes actually edit gated fields today (not /settings/account). */
export const PROFILE_COMPLETENESS_DESTINATIONS = {
  thresholds: {
    href: '/training/progression?tab=calibration',
    cta: 'Calibration',
    label: 'seuils physiologiques',
  },
  context: {
    href: '/settings/memory#memory-profile-context',
    cta: 'Mémoire coach',
    label: 'contexte personnel',
  },
} as const;

export function getProfileCompleteness(
  profile: ProfileThresholds | null | undefined,
  context: string | null | undefined,
) {
  const hasThresholds = !!(
    profile?.ftpW ||
    profile?.maxHr ||
    profile?.lthr ||
    profile?.runThresholdPaceSecPerKm
  );
  const contextText = (context ?? '').trim();
  const hasContext = contextText.length > 0;
  const gaps: ProfileCompletenessGap[] = [];
  if (!hasThresholds) {
    gaps.push({
      key: 'thresholds',
      label: PROFILE_COMPLETENESS_DESTINATIONS.thresholds.label,
      href: PROFILE_COMPLETENESS_DESTINATIONS.thresholds.href,
      cta: PROFILE_COMPLETENESS_DESTINATIONS.thresholds.cta,
    });
  }
  if (!hasContext) {
    gaps.push({
      key: 'context',
      label: PROFILE_COMPLETENESS_DESTINATIONS.context.label,
      href: PROFILE_COMPLETENESS_DESTINATIONS.context.href,
      cta: PROFILE_COMPLETENESS_DESTINATIONS.context.cta,
    });
  }

  return {
    hasThresholds,
    hasContext,
    isComplete: hasThresholds && hasContext,
    missing: gaps.map((gap) => gap.label),
    gaps,
    /** Primary CTA when incomplete — prefer context (coach planning), else thresholds. */
    primaryHref: gaps[0]?.href ?? PROFILE_COMPLETENESS_DESTINATIONS.context.href,
    contextLength: contextText.length,
  };
}
