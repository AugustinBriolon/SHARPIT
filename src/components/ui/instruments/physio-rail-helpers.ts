export function computePhysioRailProgress(
  value: number | null,
  max: number,
): { progress: number | null; visibleProgress: number | null } {
  if (value === null || max <= 0) {
    return { progress: null, visibleProgress: null };
  }
  const progress = Math.max(0, Math.min(100, (value / max) * 100));
  const visibleProgress = progress > 0 ? Math.max(progress, 7) : progress;
  return { progress, visibleProgress };
}

export function physioMarkerColor(emphasis: 'auto' | 'neutral', progress: number | null): string {
  if (emphasis === 'neutral' || progress === null) {
    return 'var(--color-signal-neutral)';
  }
  if (progress < 34) {
    return 'var(--color-signal-risk)';
  }
  if (progress < 67) {
    return 'var(--color-signal-caution)';
  }
  return 'var(--color-primary)';
}
