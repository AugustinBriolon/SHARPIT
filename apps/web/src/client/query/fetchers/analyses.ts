import type { AnalysisRunsPayload } from '@/lib/analysis/analysis-run';
import { fetchJson } from './shared';

/** Coach analyses running in the background, and what finished recently (ADR-036). */
export async function fetchAnalysisRuns(): Promise<AnalysisRunsPayload> {
  return fetchJson<AnalysisRunsPayload>('/api/analyses/status');
}
