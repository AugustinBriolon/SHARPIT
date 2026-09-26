import type { RecordsPayload } from '@sharpit/server/lib/training/records/records';
import type { ActivityRoutePreviews } from '@sharpit/server/lib/streams/route-previews';
import type {
  ActivityStreamPayload,
  MultisportStreamsPayload,
} from '@sharpit/server/lib/streams/streams';
import { fetchJson } from './shared';

export async function fetchActivityStream(id: string): Promise<ActivityStreamPayload> {
  return fetchJson<ActivityStreamPayload>(`/api/activities/${id}/streams`);
}

export async function fetchActivityRoutePreviews(): Promise<ActivityRoutePreviews> {
  return fetchJson<ActivityRoutePreviews>('/api/activities/route-previews');
}

export async function fetchMultisportStreams(id: string): Promise<MultisportStreamsPayload> {
  return fetchJson<MultisportStreamsPayload>(`/api/activities/${id}/multisport-streams`);
}

export async function fetchRecords(): Promise<RecordsPayload> {
  return fetchJson<RecordsPayload>('/api/records');
}
