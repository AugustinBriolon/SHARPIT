import { registerAiTelemetry } from '@sharpit/server/lib/ai/telemetry';

/** Next.js instrumentation hook: Langfuse OTEL + AI SDK telemetry, shared by every app. */
export async function register() {
  await registerAiTelemetry();
}
