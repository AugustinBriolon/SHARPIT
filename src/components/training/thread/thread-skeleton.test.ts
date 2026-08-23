import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThreadPageSkeleton } from './thread-skeleton';

/**
 * The rule these hold: loading keeps the same tree as loaded. Everything that
 * does not depend on data is on screen from the first frame, so nothing moves
 * when the fetch returns and the page is recognisable before a number exists.
 */
describe('ThreadPageSkeleton', () => {
  const html = renderToStaticMarkup(createElement(ThreadPageSkeleton));

  it('names the page rather than showing three grey rectangles', () => {
    expect(html).toContain('Le fil');
    expect(html).toContain('Ma semaine');
  });

  it('keeps every heading that is structure rather than data', () => {
    expect(html).toContain('Objectif');
    expect(html).toContain('Réglette de charge');
    expect(html).toContain('Prévu vs réalisé · 8 semaines');
    expect(html).toContain('Ta forme');
  });

  it('keeps the legend, which explains the grammar and not the figures', () => {
    expect(html).toContain('Plein = réalisé, pointillé = prévu');
  });

  it('draws the ruler at full height so the section does not grow on arrival', () => {
    expect(html).toContain('h-16');
    expect(html).toContain('h-24');
  });

  it('holds the waterline, which is structure and not a value', () => {
    expect(html).toContain('bg-primary/40');
  });

  it('pulses the values and nothing else', () => {
    expect(html).toContain('animate-pulse');
    // No invented figures while there are none to show.
    expect(html).not.toMatch(/\d+ TSS/);
    expect(html).not.toMatch(/J-\d+/);
  });
});
