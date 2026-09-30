import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type FinishReason,
  type TextStreamPart,
  type ToolSet,
  type UIMessage,
  type UIMessageStreamWriter,
} from 'ai';
import { NextResponse } from 'next/server';
import {
  COACH_EMPTY_ANSWER_RETRY_MODEL,
  COACH_MODEL,
  isCoachConfigured,
} from '@sharpit/server/lib/ai';
import type { buildCoachContext } from '@sharpit/server/lib/coach/context/coach-context';
import { createCoachTools } from '@sharpit/server/lib/coach/chat/tools/coach-tools';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { recordAiUsage } from '@sharpit/server/lib/ai/usage';
import {
  RETRY_AFTER_HEADER,
  aiBudgetResponseBody,
  ensureFreeAiBudget,
  withAiBudgetWarningHeader,
} from '@sharpit/server/lib/access/ai-budget';
import { requireAiProcessingConsent } from '@sharpit/server/lib/privacy/consent-store';
import {
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimiters,
} from '@sharpit/server/lib/rate-limit';
import { resolveCoachDiscussServerContext } from '@sharpit/server/lib/coach/chat/discuss/coach-discuss-server-context';
import {
  startCoachChatTiming,
  type CoachChatTiming,
} from '@sharpit/server/lib/coach/chat/coach-chat-timing';
import {
  describeCoachChatError,
  describeCoachChatOutcome,
  type CoachChatOutcome,
} from '@sharpit/server/lib/coach/chat/coach-chat-outcome';
import { withCoachTrace } from '@sharpit/server/lib/ai/coach-trace';
import { lastCoachDiscussMetadata } from '@sharpit/server/lib/coach/chat/discuss/coach-discuss-metadata-parse';
import {
  classifyCoachIntent,
  coachRequestScope,
  isPlanningThread,
  lastUserText,
  type CoachRequestScope,
} from '@sharpit/server/lib/coach/chat/coach-request-scope';
import { buildCoachSystemPrompt } from '@sharpit/server/lib/coach/chat/coach-system-prompt';
import { coachChatGenerationSettings } from '@sharpit/server/lib/coach/chat/coach-chat-generation';
import { readCoachChatHistory } from '@sharpit/server/lib/coach/chat/coach-chat-history';

/** What the athlete reads when the answer breaks mid-stream. */
export const COACH_STREAM_ERROR_COPY =
  "Le coach n'a pas pu terminer sa réponse. Réessaie dans un instant.";

/** What the athlete reads when the conversation sent is malformed. */
export const COACH_UNREADABLE_HISTORY_COPY =
  'Cette conversation ne peut pas être relue par le coach. Ouvre une nouvelle conversation.';

type BudgetWarning = Awaited<ReturnType<typeof ensureFreeAiBudget>>['warning'];

/** Consent, rate limit and free AI budget — in that order, before any model work. */
async function guardCoachChat(
  athleteId: string,
): Promise<{ blocked: Response } | { budgetWarning: BudgetWarning }> {
  const aiBlocked = await requireAiProcessingConsent(athleteId);
  if (aiBlocked) {
    return { blocked: aiBlocked };
  }

  const rateLimit = await checkRateLimit(rateLimiters.coachChat, athleteId, { failClosed: true });
  if (!rateLimit.ok) {
    const limited = rateLimitJsonResponse(rateLimit);
    return { blocked: NextResponse.json(limited.body, { status: limited.status }) };
  }

  const budget = await ensureFreeAiBudget(athleteId);
  if (!budget.allowed) {
    return {
      blocked: NextResponse.json(aiBudgetResponseBody(budget.retryAfterSeconds!), {
        status: 402,
        headers: { [RETRY_AFTER_HEADER]: String(budget.retryAfterSeconds) },
      }),
    };
  }
  return { budgetWarning: budget.warning };
}

type CoachReplyInput = {
  athleteId: string;
  system: string;
  messages: UIMessage[];
  practicedSports: Awaited<ReturnType<typeof buildCoachContext>>['practicedSports'];
  budgetWarning: BudgetWarning;
  timing: CoachChatTiming;
  scope: CoachRequestScope;
};

/** One model call of a coach turn: the first, or the retry of an answer that came back empty. */
type CoachAttempt = {
  name: 'first' | 'empty-answer-retry';
  model: string;
  reasoning: CoachRequestScope['reasoning'] | 'none';
};

type CoachAttemptEnd = { outcome: CoachChatOutcome; finishReason: FinishReason };

/**
 * A reasoning model can spend its whole turn thinking and write nothing: measured in production,
 * 13 s for 1 024 reasoning tokens and no text. The athlete then faced an empty bubble. The retry
 * asks another model, without reasoning, once; its facts are all in the prompt.
 */
const EMPTY_ANSWER_RETRY: CoachAttempt = {
  name: 'empty-answer-retry',
  model: COACH_EMPTY_ANSWER_RETRY_MODEL,
  reasoning: 'none',
};

async function streamCoachReply(input: CoachReplyInput): Promise<Response> {
  const generate = await coachGenerator(input);
  const stream = createUIMessageStream({
    onError: () => COACH_STREAM_ERROR_COPY,
    execute: async ({ writer }) => {
      const first = generate({
        name: 'first',
        model: COACH_MODEL,
        reasoning: input.scope.reasoning,
      });
      await pipeAttempt(writer, first.stream, { sendFinish: false });
      const end = first.end();
      if (end?.outcome.emptyAnswer) {
        await pipeAttempt(writer, generate(EMPTY_ANSWER_RETRY).stream, { sendStart: false });
        return;
      }
      writer.write({ type: 'finish', finishReason: end?.finishReason });
    },
  });
  return createUIMessageStreamResponse({
    stream,
    headers: withAiBudgetWarningHeader({}, input.budgetWarning),
  });
}

/**
 * Chunk by chunk rather than `writer.merge`: merged streams are piped concurrently, and the
 * turn's finish must not overtake the first attempt's last words.
 */
async function pipeAttempt(
  writer: UIMessageStreamWriter,
  stream: ReadableStream<TextStreamPart<ToolSet>>,
  options: { sendStart?: boolean; sendFinish?: boolean },
): Promise<void> {
  // The SDK default is an English « An error occurred. »; the cause is in the logs.
  const chunks = toUIMessageStream({ stream, onError: () => COACH_STREAM_ERROR_COPY, ...options });
  const reader = chunks.getReader();
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    writer.write(next.value);
  }
}

/** The shared parts of every attempt of this turn, built once: history, tools, logging. */
async function coachGenerator(input: CoachReplyInput) {
  const { athleteId, timing, scope } = input;
  // A tool call a stream left without result (a cut connection) is dropped rather than sent:
  // the provider would reject the whole request.
  const messages = await convertToModelMessages(input.messages, {
    ignoreIncompleteToolCalls: true,
  });
  const tools = createCoachTools(athleteId, { practicedSports: input.practicedSports });
  return (attempt: CoachAttempt) => {
    let end: CoachAttemptEnd | undefined;
    const result = streamText({
      model: attempt.model,
      system: input.system,
      messages,
      tools,
      ...coachChatGenerationSettings(scope),
      reasoning: attempt.reasoning,
      telemetry: { functionId: 'coach-chat' },
      onChunk: ({ chunk }) => {
        if (chunk.type === 'text-delta') {
          timing.firstText();
        }
      },
      onError: ({ error }) => {
        console.error('[coach-chat] stream error', {
          attempt: attempt.name,
          ...describeCoachChatError(error),
          ...timing.summary(),
        });
      },
      onAbort: () => {
        console.info('[coach-chat] aborted', { attempt: attempt.name, ...timing.summary() });
      },
      onEnd: (event) => {
        const { usage, steps } = event;
        void recordAiUsage(athleteId, 'coach', usage);
        timing.note('steps', steps.length);
        timing.note('inputTokens', usage.inputTokens ?? 0);
        timing.note('outputTokens', usage.outputTokens ?? 0);
        timing.note('reasoningTokens', usage.outputTokenDetails?.reasoningTokens ?? 0);
        end = { outcome: describeCoachChatOutcome(event), finishReason: event.finishReason };
        logCoachChatEnd(end.outcome, timing, attempt.name);
      },
    });
    return { stream: result.stream, end: () => end };
  };
}

/** An empty answer is logged as a warning so the log level alone finds it. */
function logCoachChatEnd(
  outcome: CoachChatOutcome,
  timing: CoachChatTiming,
  attempt: CoachAttempt['name'],
): void {
  const line = { attempt, ...timing.summary(), ...outcome };
  if (outcome.emptyAnswer) {
    console.warn('[coach-chat] empty answer', line);
    return;
  }
  console.info('[coach-chat] timing', line);
}

export async function POST(req: Request) {
  if (!isCoachConfigured()) {
    return NextResponse.json(
      {
        error: 'Coach IA non configuré. Ajoute une clé AI_GATEWAY_API_KEY dans .env.',
      },
      { status: 503 },
    );
  }

  const timing = startCoachChatTiming();
  const athleteId = await getCurrentAthleteId();
  const history = await readCoachChatHistory(await req.json().catch(() => null));
  if (!history.ok) {
    return NextResponse.json({ error: COACH_UNREADABLE_HISTORY_COPY }, { status: 400 });
  }
  const { messages } = history;

  // Discuss metadata is client-supplied: entitlements are settled here, before
  // any kind-specific data is read or any model call is made.
  const discuss = await resolveCoachDiscussServerContext(athleteId, messages);
  if (discuss.status === 'forbidden') {
    return NextResponse.json({ error: discuss.error }, { status: 403 });
  }

  const scope = coachRequestScope(
    classifyCoachIntent({
      lastUserText: lastUserText(messages),
      discussKind: lastCoachDiscussMetadata(messages)?.discussKind ?? null,
      isPlanningThread: isPlanningThread(messages),
    }),
  );

  // The guard (consent, rate limit, budget) and the prompt's reads run together: nothing
  // reaches the model before the guard has passed, but neither waits on the other.
  const prompt = buildCoachSystemPrompt(athleteId, discuss.loadBlock, scope, timing);
  prompt.catch(() => undefined);
  const guard = await guardCoachChat(athleteId);
  timing.mark('guard');
  if ('blocked' in guard) {
    return guard.blocked;
  }
  const { system, practicedSports } = await prompt;
  timing.mark('prompt');
  timing.note('promptChars', system.length);
  timing.note('messages', messages.length);
  console.info('[coach-chat] scope', { intent: scope.intent, tools: scope.tools?.length ?? 'all' });
  return withCoachTrace({ traceName: 'coach-chat', athleteId, tags: ['chat', scope.intent] }, () =>
    streamCoachReply({
      athleteId,
      system,
      messages,
      practicedSports,
      budgetWarning: guard.budgetWarning,
      timing,
      scope,
    }),
  );
}
