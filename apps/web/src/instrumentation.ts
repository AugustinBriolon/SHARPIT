import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@sharpit/app/lib/observability/sentry-options';

/** Next.js instrumentation hook: Sentry errors for the web's server rendering (ADR-060). */
export function register() {
  Sentry.init(sentryOptions('web'));
}

export const onRequestError = Sentry.captureRequestError;
