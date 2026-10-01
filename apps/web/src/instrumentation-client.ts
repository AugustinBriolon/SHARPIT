import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@sharpit/app/lib/observability/sentry-options';

// Browser errors only: no replay, no tracing, no default PII (ADR-060).
Sentry.init(sentryOptions('web'));
