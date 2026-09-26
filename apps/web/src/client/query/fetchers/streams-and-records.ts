import type { RecordsPayload } from '@sharpit/app/lib/training/records/record-types';
import type { ActivityRoutePreviews } from '@sharpit/app/lib/streams/stream-types';
import type {
  ActivityStreamPayload,
  MultisportStreamsPayload,
} from '@sharpit/app/lib/streams/stream-types';
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
