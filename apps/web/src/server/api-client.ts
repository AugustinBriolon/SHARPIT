import 'server-only';

import { cache } from 'react';
import { auth } from '@clerk/nextjs/server';

/**
 * Server components and route handlers of the web read through `api.` too (ADR-048 phase 3f):
 * the signed-in athlete's Clerk session token as a Bearer, never the database.
 */

const DEVELOPMENT_API_ORIGIN = 'http://localhost:3001';

function apiOrigin(): string {
  const origin = process.env.NEXT_PUBLIC_API_ORIGIN;
  if (origin) {
    return origin;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_ORIGIN is not configured');
  }
  return DEVELOPMENT_API_ORIGIN;
}

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`api. answered ${status} on ${path.split('?')[0]}`);
    this.name = 'ApiRequestError';
  }
}

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

/**
 * The payloads carry the server's `Date` fields as ISO strings (`JSON.stringify`); the pages
 * that used to read the database get them back as `Date`s. Date-only strings
 * (`trainingDayId`, `YYYY-MM-DD`) stay strings.
 */
export function reviveDates(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO_DATE_TIME.test(value) ? new Date(value) : value;
}

/** A request to `api.` as the signed-in athlete. `origin`: the page's, for connect flows. */
export async function serverApiFetch(
  path: string,
  init: RequestInit & { origin?: string } = {},
): Promise<Response> {
  const { getToken } = await auth();
  const token = await getToken();
  const { origin, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (origin) {
    headers.set('Origin', origin);
  }
  return fetch(`${apiOrigin()}${path}`, { ...rest, headers, cache: 'no-store' });
}

/**
 * JSON from `api.`; null on 404; throws on any other failure. `reviveDateFields` for
 * payloads whose type carries `Date`s (database rows); off for payloads that are strings by
 * contract (ISO snapshots).
 */
export async function serverApiJson<T>(path: string, reviveDateFields = false): Promise<T | null> {
  const response = await serverApiFetch(path);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new ApiRequestError(response.status, path);
  }
  return JSON.parse(await response.text(), reviveDateFields ? reviveDates : undefined) as T;
}

/** One `api.` read per path per render, shared by every server component that asks. */
export const cachedServerApiJson = cache(serverApiJson) as <T>(
  path: string,
  reviveDateFields?: boolean,
) => Promise<T | null>;
