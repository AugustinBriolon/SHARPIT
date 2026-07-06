type ProfileThresholds = {
  ftpW?: number | null;
  maxHr?: number | null;
  lthr?: number | null;
  runThresholdPaceSecPerKm?: number | null;
};

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
  const missing: string[] = [];
  if (!hasThresholds) missing.push('seuils physiologiques');
  if (!hasContext) missing.push('contexte personnel');

  return {
    hasThresholds,
    hasContext,
    isComplete: hasThresholds && hasContext,
    missing,
    contextLength: contextText.length,
  };
}
