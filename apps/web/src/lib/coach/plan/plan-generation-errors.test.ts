import { describe, expect, it } from 'vitest';
import {
  coachGenerationErrorDetails,
  planGenerationErrorMessage,
} from '@/lib/coach/plan/plan-generation-errors';

describe('planGenerationErrorMessage', () => {
  it('maps schema failures to a retryable FR message', () => {
    expect(
      planGenerationErrorMessage(new Error('No object generated: response did not match schema.')),
    ).toMatch(/proposition incomplète/i);
  });

  it('maps network failures', () => {
    expect(planGenerationErrorMessage(new Error('fetch failed'))).toMatch(/Connexion/i);
  });
});

describe('coachGenerationErrorDetails', () => {
  it('flattens nested Zod issues for ops logs', () => {
    const error = {
      message: 'No object generated: response did not match schema.',
      cause: {
        cause: {
          issues: [{ path: ['sessions', 0, 'load'], message: 'Expected integer, received number' }],
        },
      },
    };
    expect(coachGenerationErrorDetails(error)).toContain('sessions.0.load');
  });
});
