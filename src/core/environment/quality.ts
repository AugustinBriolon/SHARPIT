/**
 * Evidence quality and confidence semantics.
 *
 * Quality = epistemic precision of the evidence.
 * Confidence = statistical trust (0–1) — distinct from quality.
 */

import type { EnvironmentalEvidenceQuality, FieldQuality } from './types';
import { qualityRank } from './record';

const QUALITY_CONFIDENCE: Record<Exclude<EnvironmentalEvidenceQuality, 'MISSING'>, number> = {
  EXACT: 0.95,
  INTERPOLATED: 0.75,
  ESTIMATED: 0.6,
};

export function fieldQualityExact(
  providerId: FieldQuality['sourceProviderId'],
  method = 'DIRECT',
): FieldQuality {
  return {
    quality: 'EXACT',
    confidence: QUALITY_CONFIDENCE.EXACT,
    method,
    sourceProviderId: providerId,
  };
}

export function fieldQualityInterpolated(
  providerId: FieldQuality['sourceProviderId'],
  method: string,
  confidence = QUALITY_CONFIDENCE.INTERPOLATED,
): FieldQuality {
  return {
    quality: 'INTERPOLATED',
    confidence,
    method,
    sourceProviderId: providerId,
  };
}

export function fieldQualityEstimated(
  method: string,
  confidence = QUALITY_CONFIDENCE.ESTIMATED,
): FieldQuality {
  return {
    quality: 'ESTIMATED',
    confidence,
    method,
    sourceProviderId: null,
  };
}

export function fieldQualityMissing(): FieldQuality {
  return {
    quality: 'MISSING',
    confidence: 0,
    method: null,
    sourceProviderId: null,
  };
}

export function weatherFieldQuality(
  measurements: Record<string, number | null | undefined>,
  providerId: FieldQuality['sourceProviderId'],
): Partial<Record<string, FieldQuality>> {
  const result: Partial<Record<string, FieldQuality>> = {};
  for (const [field, value] of Object.entries(measurements)) {
    result[field] = value != null ? fieldQualityExact(providerId) : fieldQualityMissing();
  }
  return result;
}

export function aggregateFieldQuality(
  fieldQuality: Partial<Record<string, FieldQuality>>,
): EnvironmentalEvidenceQuality {
  const qualities = Object.values(fieldQuality).map((f) => f?.quality ?? 'MISSING');
  if (qualities.length === 0 || qualities.every((q) => q === 'MISSING')) return 'MISSING';

  let worst: EnvironmentalEvidenceQuality = 'EXACT';
  for (const q of qualities) {
    if (qualityRank(q) < qualityRank(worst)) worst = q;
  }
  return worst;
}

export function confidenceFromFieldQualities(
  fieldQuality: Partial<Record<string, FieldQuality>>,
): number {
  const values = Object.values(fieldQuality).filter((f): f is FieldQuality => f != null);
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, f) => sum + f.confidence, 0) / values.length;
  return Math.round(avg * 100) / 100;
}

export function confidenceFromRecords(records: readonly { confidence: number }[]): number {
  if (records.length === 0) return 0;
  const avg = records.reduce((sum, r) => sum + r.confidence, 0) / records.length;
  return Math.round(avg * 100) / 100;
}
