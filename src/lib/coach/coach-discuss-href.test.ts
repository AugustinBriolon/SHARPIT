import { describe, expect, it } from 'vitest';
import { coachDiscussHref } from '@/lib/coach/coach-discuss-href';
import { buildPlannedSessionDiscussPrompt } from '@/lib/coach/coach-session-thread';

describe('coachDiscussHref', () => {
  it('builds planned-session, activity and planning links', () => {
    expect(coachDiscussHref({ kind: 'planned-session', sessionId: 'abc' })).toBe(
      '/coach?discuss=abc',
    );
    expect(coachDiscussHref({ kind: 'activity', activityId: 'act-1' })).toBe(
      '/coach?discussActivity=act-1',
    );
    expect(coachDiscussHref({ kind: 'planning', horizonDays: 7 })).toBe('/coach?discussPlanning=7');
  });
});

describe('buildPlannedSessionDiscussPrompt', () => {
  it('includes schedule and prescription details', () => {
    const prompt = buildPlannedSessionDiscussPrompt({
      title: 'Seuil vélo',
      sportLabel: 'Vélo',
      date: new Date('2026-07-23T10:00:00.000Z'),
      startTime: '18:30',
      durationMin: 60,
      load: 55,
      intensity: 'THRESHOLD',
      description: '3×8 min Z4',
      exposureLabel: 'Intérieur / home trainer',
      locationLabel: 'Garage',
    });

    expect(prompt).toContain('séance prévue « Seuil vélo »');
    expect(prompt).toContain('Vélo');
    expect(prompt).toContain('18:30');
    expect(prompt).toContain('60 min');
    expect(prompt).toContain('55 TSS');
    expect(prompt).toContain('3×8 min Z4');
    expect(prompt).toContain('home trainer');
    expect(prompt).toContain('Garage');
    expect(prompt).toContain("J'aimerais en discuter avec toi");
  });

  it('falls back to sport label when title is empty', () => {
    const prompt = buildPlannedSessionDiscussPrompt({
      title: '  ',
      sportLabel: 'Course',
      date: new Date('2026-07-23T10:00:00.000Z'),
    });
    expect(prompt).toContain('« Course »');
  });
});
