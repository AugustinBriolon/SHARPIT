import { formatPlannedDuration } from '@/lib/planned-session/sessions';
import { formatTrainingLoad, type DisplayMode } from '@/lib/preferences/display-mode';

type SessionSide = {
  durationMin: number | null;
  load: number | null;
  intensityLabel?: string | null;
};

function appendDuration(parts: string[], durationMin: number | null) {
  if (durationMin !== null) {
    parts.push(formatPlannedDuration(durationMin));
  }
}

function appendLoadChange(
  parts: string[],
  current: SessionSide,
  proposed: SessionSide,
  mode: DisplayMode,
) {
  if (current.load !== null && proposed.load !== null && current.load !== proposed.load) {
    parts.push(
      `${formatTrainingLoad(current.load, mode)} → ${formatTrainingLoad(proposed.load, mode)}`,
    );
    return;
  }
  if (proposed.load !== null) {
    parts.push(formatTrainingLoad(proposed.load, mode));
    return;
  }
  if (current.load !== null) {
    parts.push(formatTrainingLoad(current.load, mode));
  }
}

export function compareMeta(current: SessionSide, proposed: SessionSide, mode: DisplayMode) {
  const parts: string[] = [];
  appendDuration(parts, proposed.durationMin ?? current.durationMin);
  appendLoadChange(parts, current, proposed, mode);
  return parts.length > 0 ? parts.join(' · ') : null;
}
