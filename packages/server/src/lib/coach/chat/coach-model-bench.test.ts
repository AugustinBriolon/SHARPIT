import { describe, expect, it } from 'vitest';
import {
  formatCoachBenchReport,
  percentile,
  summarizeCoachBench,
  type CoachBenchRun,
} from '@sharpit/server/lib/coach/chat/coach-model-bench';

function run(overrides: Partial<CoachBenchRun> = {}): CoachBenchRun {
  return {
    model: 'google/gemini-3-flash',
    intent: 'recovery',
    question: 'Comment était ma nuit ?',
    firstTextMs: 2_000,
    totalMs: 5_000,
    emptyAnswer: false,
    error: null,
    finishReason: 'stop',
    inputTokens: 10_000,
    outputTokens: 400,
    reasoningTokens: 100,
    toolCalls: [],
    text: 'Nuit courte : 6 h 10.',
    ...overrides,
  };
}

describe('percentile', () => {
  it('reads the nearest rank', () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([5, 1, 3, 2, 4], 90)).toBe(5);
    expect(percentile([5, 1, 3, 2, 4], 100)).toBe(5);
  });

  it('is null without values', () => {
    expect(percentile([], 50)).toBeNull();
  });
});

describe('summarizeCoachBench', () => {
  it('compares each model on latency, breakage and tokens', () => {
    const [deepseek, gemini] = summarizeCoachBench([
      run({ model: 'deepseek/deepseek-v4-flash', firstTextMs: 18_000, totalMs: 70_000 }),
      run({
        model: 'deepseek/deepseek-v4-flash',
        firstTextMs: null,
        totalMs: 13_000,
        emptyAnswer: true,
        outputTokens: 1_025,
        reasoningTokens: 1_024,
      }),
      run(),
    ]);

    expect(deepseek).toMatchObject({
      model: 'deepseek/deepseek-v4-flash',
      runs: 2,
      firstTextP50Ms: 18_000,
      totalMaxMs: 70_000,
      overRouteLimit: 1,
      emptyAnswers: 1,
      errors: 0,
      meanReasoningTokens: 562,
    });
    expect(gemini).toMatchObject({ runs: 1, firstTextP50Ms: 2_000, overRouteLimit: 0 });
  });

  it('counts errors apart from empty answers', () => {
    const [summary] = summarizeCoachBench([
      run({ error: 'AI_APICallError: 503', firstTextMs: null }),
    ]);
    expect(summary).toMatchObject({ errors: 1, emptyAnswers: 0, firstTextP50Ms: null });
  });
});

describe('formatCoachBenchReport', () => {
  it('puts the summary first, then each question with every model’s answer', () => {
    const report = formatCoachBenchReport(
      [run(), run({ model: 'anthropic/claude-haiku-4.5', text: '', emptyAnswer: true })],
      new Date('2026-09-30T10:00:00Z'),
    );

    expect(report.indexOf('## Summary')).toBeLessThan(report.indexOf('## Answers'));
    expect(report).toContain('### « Comment était ma nuit ? » (recovery)');
    expect(report).toContain('#### anthropic/claude-haiku-4.5');
    expect(report).toContain('_(no text)_');
  });
});
