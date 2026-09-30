/**
 * The pure half of the coach model benchmark (`apps/api/scripts/bench-coach-models.ts`): one run
 * per model and question in, a comparison per model out.
 */

/** Vercel cuts the chat route at `maxDuration`: a slower answer never reaches the athlete. */
export const CHAT_ROUTE_LIMIT_MS = 60_000;

export type CoachBenchRun = {
  model: string;
  intent: string;
  question: string;
  /** Null when no text ever came: an empty answer, an error or a timeout. */
  firstTextMs: number | null;
  totalMs: number;
  emptyAnswer: boolean;
  error: string | null;
  finishReason: string | null;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  toolCalls: string[];
  text: string;
};

export type CoachBenchModelSummary = {
  model: string;
  runs: number;
  firstTextP50Ms: number | null;
  firstTextP90Ms: number | null;
  totalP50Ms: number | null;
  totalP90Ms: number | null;
  totalMaxMs: number | null;
  /** Runs slower than the chat route allows: in production, these break mid-answer. */
  overRouteLimit: number;
  emptyAnswers: number;
  errors: number;
  meanInputTokens: number;
  meanOutputTokens: number;
  meanReasoningTokens: number;
};

/** Nearest-rank percentile; null for no values. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1]!;
}

function mean(values: readonly number[]): number {
  return values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;
}

function summarizeModel(model: string, runs: readonly CoachBenchRun[]): CoachBenchModelSummary {
  const firstTexts = runs.flatMap((r) => (r.firstTextMs === null ? [] : [r.firstTextMs]));
  const totals = runs.map((r) => r.totalMs);
  return {
    model,
    runs: runs.length,
    firstTextP50Ms: percentile(firstTexts, 50),
    firstTextP90Ms: percentile(firstTexts, 90),
    totalP50Ms: percentile(totals, 50),
    totalP90Ms: percentile(totals, 90),
    totalMaxMs: percentile(totals, 100),
    overRouteLimit: totals.filter((ms) => ms > CHAT_ROUTE_LIMIT_MS).length,
    emptyAnswers: runs.filter((r) => r.emptyAnswer).length,
    errors: runs.filter((r) => r.error !== null).length,
    meanInputTokens: mean(runs.map((r) => r.inputTokens)),
    meanOutputTokens: mean(runs.map((r) => r.outputTokens)),
    meanReasoningTokens: mean(runs.map((r) => r.reasoningTokens)),
  };
}

/** One summary per model, in the order the models were first run. */
export function summarizeCoachBench(runs: readonly CoachBenchRun[]): CoachBenchModelSummary[] {
  const models = [...new Set(runs.map((r) => r.model))];
  return models.map((model) =>
    summarizeModel(
      model,
      runs.filter((r) => r.model === model),
    ),
  );
}

function seconds(ms: number | null): string {
  return ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`;
}

function summaryTable(summaries: readonly CoachBenchModelSummary[]): string {
  const header =
    '| Model | Runs | First text p50 | First text p90 | Total p50 | Total p90 | Max | > 60 s | Empty | Errors | In tok | Out tok | Reasoning tok |\n' +
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|';
  const rows = summaries.map(
    (s) =>
      `| ${s.model} | ${s.runs} | ${seconds(s.firstTextP50Ms)} | ${seconds(s.firstTextP90Ms)} | ${seconds(s.totalP50Ms)} | ${seconds(s.totalP90Ms)} | ${seconds(s.totalMaxMs)} | ${s.overRouteLimit} | ${s.emptyAnswers} | ${s.errors} | ${s.meanInputTokens} | ${s.meanOutputTokens} | ${s.meanReasoningTokens} |`,
  );
  return [header, ...rows].join('\n');
}

function runSection(run: CoachBenchRun): string {
  const status = run.error
    ? `error: ${run.error}`
    : `${run.finishReason ?? '—'} · first text ${seconds(run.firstTextMs)} · total ${seconds(run.totalMs)}`;
  const tools = run.toolCalls.length ? `\n\nTools: ${run.toolCalls.join(', ')}` : '';
  const text = run.text.trim() || '_(no text)_';
  return `#### ${run.model}\n\n${status}${tools}\n\n${text}`;
}

/** The report: the comparison first, then every answer grouped by question for a quality read. */
export function formatCoachBenchReport(runs: readonly CoachBenchRun[], generatedAt: Date): string {
  const questions = [...new Set(runs.map((r) => r.question))];
  const answers = questions.map((question) => {
    const forQuestion = runs.filter((r) => r.question === question);
    return `### « ${question} » (${forQuestion[0]!.intent})\n\n${forQuestion.map(runSection).join('\n\n')}`;
  });
  return [
    `# Coach model benchmark — ${generatedAt.toISOString()}`,
    '## Summary',
    summaryTable(summarizeCoachBench(runs)),
    '## Answers',
    ...answers,
  ].join('\n\n');
}
