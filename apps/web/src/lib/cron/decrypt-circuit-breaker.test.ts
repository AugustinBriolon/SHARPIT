import { describe, expect, it } from 'vitest';
import {
  DecryptCircuitBreaker,
  DEFAULT_DECRYPT_CIRCUIT_ABSOLUTE,
  DEFAULT_DECRYPT_CIRCUIT_MIN_SAMPLE,
  DEFAULT_DECRYPT_CIRCUIT_RATE,
} from '@/lib/cron/decrypt-circuit-breaker';

describe('DecryptCircuitBreaker', () => {
  it('trips on absolute authenticity-failure count across the fleet', () => {
    const breaker = new DecryptCircuitBreaker({
      absoluteCount: 3,
      minSample: 100,
      rate: 0.9,
    });

    for (let i = 0; i < 3; i++) {
      breaker.recordAthleteProcessed({ authenticityFailure: true });
    }

    expect(breaker.isTripped()).toBe(true);
    expect(breaker.authenticityFailureCount).toBe(3);
  });

  it('trips on high failure rate once the sample is large enough', () => {
    const breaker = new DecryptCircuitBreaker({
      absoluteCount: 100,
      minSample: 4,
      rate: 0.5,
    });

    breaker.recordAthleteProcessed({ authenticityFailure: true });
    breaker.recordAthleteProcessed({ authenticityFailure: true });
    breaker.recordAthleteProcessed({ authenticityFailure: false });
    expect(breaker.isTripped()).toBe(false);

    breaker.recordAthleteProcessed({ authenticityFailure: true });
    expect(breaker.isTripped()).toBe(true);
  });

  it('does not trip on sparse single-athlete failures under defaults', () => {
    const breaker = new DecryptCircuitBreaker({
      absoluteCount: DEFAULT_DECRYPT_CIRCUIT_ABSOLUTE,
      minSample: DEFAULT_DECRYPT_CIRCUIT_MIN_SAMPLE,
      rate: DEFAULT_DECRYPT_CIRCUIT_RATE,
    });

    breaker.recordAthleteProcessed({ authenticityFailure: true });
    breaker.recordAthleteProcessed({ authenticityFailure: false });
    expect(breaker.isTripped()).toBe(false);
  });
});
