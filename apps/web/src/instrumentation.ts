/**
 * Next.js instrumentation — registers Langfuse OTEL + AI SDK v7 telemetry
 * once per Node server process. Edge runtime is skipped (no NodeSDK).
 *
 * Env (already in .env / Vercel):
 * - LANGFUSE_PUBLIC_KEY
 * - LANGFUSE_SECRET_KEY
 * - LANGFUSE_BASE_URL (optional; defaults to EU cloud)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { isLangfuseConfigured, getLangfuseSpanProcessor } =
    await import('@sharpit/server/lib/ai/langfuse');
  if (!isLangfuseConfigured()) {
    return;
  }

  const processor = await getLangfuseSpanProcessor();
  if (!processor) {
    return;
  }

  const { registerTelemetry } = await import('ai');
  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { LangfuseVercelAiSdkIntegration } = await import('@langfuse/vercel-ai-sdk');

  const sdk = new NodeSDK({
    spanProcessors: [processor],
  });
  sdk.start();
  registerTelemetry(new LangfuseVercelAiSdkIntegration());
}
