import type { RecordsPayload } from '@/lib/training/records/records';
import type { ActivityStreamPayload, MultisportStreamsPayload } from '@/lib/streams/streams';
import { fetchJson } from './shared';

export async function fetchActivityStream(id: string): Promise<ActivityStreamPayload> {
  return fetchJson<ActivityStreamPayload>(`/api/activities/${id}/streams`);
}

export async function fetchMultisportStreams(id: string): Promise<MultisportStreamsPayload> {
  return fetchJson<MultisportStreamsPayload>(`/api/activities/${id}/multisport-streams`);
}

export async function fetchRecords(): Promise<RecordsPayload> {
  return fetchJson<RecordsPayload>('/api/records');
}
