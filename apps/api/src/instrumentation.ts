import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@sharpit/app/lib/observability/sentry-options';
import { registerAiTelemetry } from '@sharpit/server/lib/ai/telemetry';

/**
 * Next.js instrumentation hook: Sentry errors (ADR-060), then Langfuse OTEL + AI SDK telemetry,
 * shared by every app. Sentry leaves OpenTelemetry to Langfuse.
 */
export async function register() {
  Sentry.init(sentryOptions('api'));
  await registerAiTelemetry();
}

export const onRequestError = Sentry.captureRequestError;
