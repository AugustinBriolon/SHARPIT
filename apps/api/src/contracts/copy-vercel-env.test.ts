import { describe, expect, it } from 'vitest';
import { planEnvCopy } from '../../scripts/copy-vercel-env.mjs';

const production = ['production'];

describe('planEnvCopy', () => {
  it('copies readable Production values and keeps their type', () => {
    const plan = planEnvCopy(
      [
        {
          id: '1',
          key: 'DATABASE_URL',
          type: 'encrypted',
          target: production,
          value: 'postgres://x',
          decrypted: true,
        },
        { id: '2', key: 'COACH_MODEL', type: 'plain', target: production, value: 'model' },
      ],
      ['DATABASE_URL', 'COACH_MODEL'],
      new Set(),
    );
    expect(plan.copy).toEqual([
      { key: 'DATABASE_URL', value: 'postgres://x', type: 'encrypted' },
      { key: 'COACH_MODEL', value: 'model', type: 'plain' },
    ]);
  });

  it('keeps a multi-line value byte for byte', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';
    const plan = planEnvCopy(
      [
        {
          id: '1',
          key: 'APNS_PRIVATE_KEY',
          type: 'encrypted',
          target: production,
          value: pem,
          decrypted: true,
        },
      ],
      ['APNS_PRIVATE_KEY'],
      new Set(),
    );
    expect(plan.copy[0]?.value).toBe(pem);
  });

  it('lists sensitive, missing and already present variables instead of copying them', () => {
    const plan = planEnvCopy(
      [
        { id: '1', key: 'CLERK_SECRET_KEY', type: 'sensitive', target: production },
        { id: '2', key: 'PREVIEW_ONLY', type: 'encrypted', target: ['preview'], value: 'x' },
        {
          id: '3',
          key: 'DIRECT_URL',
          type: 'encrypted',
          target: production,
          value: 'y',
          decrypted: true,
        },
      ],
      ['CLERK_SECRET_KEY', 'PREVIEW_ONLY', 'DIRECT_URL', 'NOPE'],
      new Set(['DIRECT_URL']),
    );
    expect(plan).toEqual({
      copy: [],
      sensitive: ['CLERK_SECRET_KEY'],
      missing: ['PREVIEW_ONLY', 'NOPE'],
      present: ['DIRECT_URL'],
    });
  });

  it('never copies an encrypted value Vercel did not decrypt (its ciphertext)', () => {
    const plan = planEnvCopy(
      [
        {
          id: '1',
          key: 'UPSTASH_REDIS_REST_URL',
          type: 'encrypted',
          target: production,
          value: 'eyJ2IjoidjIi…ciphertext',
          decrypted: false,
        },
      ],
      ['UPSTASH_REDIS_REST_URL'],
      new Set(),
    );
    expect(plan.copy).toEqual([]);
    expect(plan.sensitive).toEqual(['UPSTASH_REDIS_REST_URL']);
  });
});
