import { describe, expect, it } from 'vitest';
import { motionConfig } from '@/lib/motion/config';
import { motionTokens, springs } from '@/lib/motion/tokens';
import {
  collapseVariants,
  fadeTransition,
  fadeUpVariants,
  routeFadeTransition,
  staggerContainer,
  staggerItem,
} from '@/lib/motion/variants';

describe('motionTokens (DESIGN_LANGUAGE §9)', () => {
  it('caps all durations at 300ms', () => {
    expect(motionTokens.duration.instant).toBeLessThanOrEqual(0.3);
    expect(motionTokens.duration.fast).toBeLessThanOrEqual(0.3);
    expect(motionTokens.duration.normal).toBeLessThanOrEqual(0.3);
    expect(motionTokens.duration.slow).toBeLessThanOrEqual(0.3);
  });

  it('uses SHARPIT press scale 0.96', () => {
    expect(motionTokens.scale.press).toBe(0.96);
  });

  it('keeps stagger children between 50–100ms', () => {
    expect(motionTokens.stagger.children).toBeGreaterThanOrEqual(0.05);
    expect(motionTokens.stagger.children).toBeLessThanOrEqual(0.1);
  });

  it('exposes release spring without bounce', () => {
    expect(springs.release.type).toBe('spring');
    expect(springs.snappy.bounce).toBe(0);
    expect(springs.gentle.bounce).toBe(0);
  });
});

describe('motion variants', () => {
  it('fadeUp uses token distance', () => {
    const variants = fadeUpVariants();
    expect(variants.hidden).toMatchObject({ y: motionTokens.distance.md });
  });

  it('transitions use token durations only', () => {
    expect(fadeTransition.duration).toBe(motionTokens.duration.fast);
    expect(routeFadeTransition.duration).toBe(motionTokens.duration.slow);
  });

  it('stagger container uses token stagger', () => {
    const visible = staggerContainer.visible as { transition: { staggerChildren: number } };
    expect(visible.transition.staggerChildren).toBe(motionTokens.stagger.children);
  });

  it('stagger item starts from token sm distance', () => {
    expect(staggerItem.hidden).toMatchObject({ y: motionTokens.distance.sm });
  });

  it('collapse uses gridTemplateRows not raw height', () => {
    expect(collapseVariants.collapsed).toMatchObject({ gridTemplateRows: '0fr' });
    expect(collapseVariants.expanded).toMatchObject({ gridTemplateRows: '1fr' });
  });
});

describe('motionConfig', () => {
  it('shouldAnimate returns a boolean', () => {
    expect(typeof motionConfig.shouldAnimate()).toBe('boolean');
    expect(typeof motionConfig.shouldAnimate({ essential: true })).toBe('boolean');
  });
});
