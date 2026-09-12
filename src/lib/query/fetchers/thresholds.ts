import type { ThresholdApplyPreview } from '@/lib/threshold/threshold-estimates';
import type { ClientThresholdSnapshot } from '../types';
import { fetchJson, type Serialized, toDate } from './shared';

export type { ThresholdApplyPreview };

export async function fetchThresholdPreview(): Promise<ThresholdApplyPreview> {
  return fetchJson<ThresholdApplyPreview>('/api/athlete-profile/apply-estimates');
}

export async function fetchThresholdHistory(): Promise<ClientThresholdSnapshot[]> {
  const data = await fetchJson<Serialized<ClientThresholdSnapshot>[]>(
    '/api/athlete-profile/threshold-history',
  );
  return data.map((s) => ({
    ...s,
    createdAt: toDate(s.createdAt),
  }));
}
