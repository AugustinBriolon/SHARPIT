/**
 * Staleness of a session already sent to the watch.
 *
 * The session itself has not changed here — the athlete's thresholds moved
 * underneath it, which `garminPushClearOnSessionChange` cannot see. Kept free of
 * any Prisma runtime import so the read view can compute it client-side.
 */
import type {
  EndurancePrescription,
  EnduranceStep,
} from '@/lib/planned-session/endurance/endurance-prescription';
import type { AthleteThresholds } from '@/lib/planned-session/endurance/endurance-targets';
import { isSet } from '@/lib/util/value';

function hrThresholdKeys(
  ref: EnduranceStep['target']['hrRef'] | undefined,
): Array<keyof AthleteThresholds> {
  if (ref === 'maxhr') {
    return ['maxHr'];
  }
  if (ref === 'lthr') {
    return ['lthr'];
  }
  return ['lthr', 'maxHr'];
}

function metricThresholdKey(
  metric: EnduranceStep['target']['metric'],
): keyof AthleteThresholds | null {
  if (metric === 'pace') {
    return 'runThresholdPaceSecPerKm';
  }
  if (metric === 'power') {
    return 'ftpW';
  }
  if (metric === 'hr') {
    return null;
  }
  return null;
}

function keysFromStepTarget(step: EnduranceStep): Array<keyof AthleteThresholds> {
  const { target } = step;
  if (isSet(target.absEasy) && isSet(target.absHard)) {
    return [];
  }
  if (target.metric === 'hr') {
    return hrThresholdKeys(target.hrRef ?? 'auto');
  }
  const key = metricThresholdKey(target.metric);
  return key ? [key] : [];
}

/** Athlete references a prescription actually depends on, override-aware. */
export function thresholdKeysUsedBy(
  prescription: EndurancePrescription,
): Array<keyof AthleteThresholds> {
  const keys = new Set<keyof AthleteThresholds>();

  const visit = (step: EnduranceStep): void => {
    keysFromStepTarget(step).forEach((key) => keys.add(key));
  };

  for (const block of prescription.blocks) {
    if (block.kind === 'step') {
      visit(block.step);
    } else {
      block.steps.forEach(visit);
    }
  }
  return [...keys];
}

export type GarminThresholdChange = {
  key: keyof AthleteThresholds;
  from: number | null;
  to: number | null;
};

export type GarminPushStaleness = {
  /** True when a threshold this session's targets depend on moved since the push. */
  stale: boolean;
  changed: GarminThresholdChange[];
};

const FRESH: GarminPushStaleness = { stale: false, changed: [] };

/**
 * Detect a session already on the watch whose targets no longer match the athlete.
 *
 * The session itself is unchanged here — the thresholds moved underneath it, which
 * is invisible to `garminPushClearOnSessionChange`. Comparing only the references
 * the prescription actually uses keeps an FTP update from flagging a run session.
 */
export function garminPushStaleness(input: {
  prescription: EndurancePrescription | null;
  pushedThresholds: Partial<AthleteThresholds> | null;
  currentThresholds: AthleteThresholds;
  hasPush: boolean;
}): GarminPushStaleness {
  if (!input.hasPush || !input.prescription || !input.pushedThresholds) {
    return FRESH;
  }

  const changed = thresholdKeysUsedBy(input.prescription)
    .map((key) => ({
      key,
      from: input.pushedThresholds?.[key] ?? null,
      to: input.currentThresholds[key] ?? null,
    }))
    .filter((change) => change.from !== change.to);

  return { stale: changed.length > 0, changed };
}

/** Narrow a threshold bag read back from Json — unknown shapes degrade to null. */
export function parsePushedThresholds(raw: unknown): Partial<AthleteThresholds> | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const numberOrNull = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  return {
    runThresholdPaceSecPerKm: numberOrNull(record.runThresholdPaceSecPerKm),
    swimCssSecPer100m: numberOrNull(record.swimCssSecPer100m),
    ftpW: numberOrNull(record.ftpW),
    lthr: numberOrNull(record.lthr),
    maxHr: numberOrNull(record.maxHr),
  };
}
