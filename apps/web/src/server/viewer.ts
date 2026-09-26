import 'server-only';

import type { WebViewer } from '@sharpit/app/lib/web/payloads';
import { cachedServerApiJson } from '@/server/api-client';

/** The signed-in visitor's routing context, read once per render from `api.`. */
export async function getViewer(): Promise<WebViewer> {
  const viewer = await cachedServerApiJson<WebViewer>('/api/web/viewer');
  if (!viewer) {
    throw new Error('api. has no viewer for this session');
  }
  return viewer;
}
