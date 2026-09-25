/**
 * Fleet-level circuit breaker for AES-GCM authenticity failures during cron.
 *
 * A wrong SECRET_ENCRYPTION_KEY (or preview/prod key mix against a shared DB)
 * surfaces as many athletes failing decrypt in one tick. Trip early, stop
 * credential-mutating work, and fail the run loudly — never revoke anyone.
 */

export const DEFAULT_DECRYPT_CIRCUIT_ABSOLUTE = 5;
export const DEFAULT_DECRYPT_CIRCUIT_MIN_SAMPLE = 10;
export const DEFAULT_DECRYPT_CIRCUIT_RATE = 0.5;

export type DecryptCircuitThresholds = {
  /** Trip after this many athletes report an authenticity decrypt failure. */
  absoluteCount: number;
  /** Minimum athletes processed before rate-based trip is eligible. */
  minSample: number;
  /** Trip when authenticityFailureCount / athletesProcessed >= rate. */
  rate: number;
};

export class DecryptCircuitBreaker {
  private athletesProcessed = 0;
  private authenticityFailures = 0;
  private tripped = false;
  private readonly thresholds: DecryptCircuitThresholds;

  constructor(thresholds?: Partial<DecryptCircuitThresholds>) {
    this.thresholds = {
      absoluteCount: thresholds?.absoluteCount ?? DEFAULT_DECRYPT_CIRCUIT_ABSOLUTE,
      minSample: thresholds?.minSample ?? DEFAULT_DECRYPT_CIRCUIT_MIN_SAMPLE,
      rate: thresholds?.rate ?? DEFAULT_DECRYPT_CIRCUIT_RATE,
    };
  }

  get authenticityFailureCount(): number {
    return this.authenticityFailures;
  }

  get processedCount(): number {
    return this.athletesProcessed;
  }

  isTripped(): boolean {
    return this.tripped;
  }

  recordAthleteProcessed(input: { authenticityFailure: boolean }): void {
    if (this.tripped) {
      return;
    }
    this.athletesProcessed += 1;
    if (input.authenticityFailure) {
      this.authenticityFailures += 1;
    }
    if (this.authenticityFailures >= this.thresholds.absoluteCount) {
      this.tripped = true;
      return;
    }
    if (
      this.athletesProcessed >= this.thresholds.minSample &&
      this.authenticityFailures / this.athletesProcessed >= this.thresholds.rate
    ) {
      this.tripped = true;
    }
  }

  tripReason(): string {
    return (
      'Decrypt circuit breaker tripped: likely SECRET_ENCRYPTION_KEY mismatch. ' +
      `authenticityFailures=${this.authenticityFailures}/${this.athletesProcessed}. ` +
      'No credentials were wiped. Fix the key and re-run.'
    );
  }
}
