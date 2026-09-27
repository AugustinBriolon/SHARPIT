'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const EASE = 'expo.out';
const PIN_BREAKPOINT = '(min-width: 768px)';

function animateHero() {
  const intro = gsap.timeline({ defaults: { ease: EASE } });
  intro
    .from('[data-hero-line]', { yPercent: 110, duration: 1.2, stagger: 0.12 })
    .from('[data-hero-fade]', { autoAlpha: 0, y: 24, duration: 1, stagger: 0.08 }, 0.35)
    .from('[data-tick]', { scaleY: 0, duration: 0.6, stagger: 0.012, ease: 'power3.out' }, 0.6)
    .from('[data-marker]', { left: '0%', duration: 1.6, ease: 'power4.inOut' }, 0.9);

  gsap.to('[data-hero-body]', {
    yPercent: -12,
    autoAlpha: 0.2,
    ease: 'none',
    scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
  });
}

/** Desktop: the three steps share one pinned stage and hand over as the athlete scrolls. */
function animatePinnedChain() {
  const steps = gsap.utils.toArray<HTMLElement>('[data-chain-step]');
  const counter = document.querySelector<HTMLElement>('[data-chain-counter]');
  gsap.set(steps.slice(1), { autoAlpha: 0, y: 60 });
  const stage = gsap.timeline({
    scrollTrigger: {
      trigger: '[data-chain]',
      start: 'top top',
      end: `+=${steps.length * 90}%`,
      pin: true,
      scrub: 0.6,
      onUpdate: (self) => {
        if (counter) {
          const current = Math.min(steps.length, Math.floor(self.progress * steps.length) + 1);
          counter.textContent = `${String(current).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
        }
      },
    },
  });
  stage.fromTo(
    '[data-chain-progress]',
    { scaleX: 0 },
    { scaleX: 1, ease: 'none', duration: steps.length },
    0,
  );
  steps.slice(1).forEach((step, i) => {
    stage
      .to(steps[i], { autoAlpha: 0, y: -60, duration: 0.4 }, i + 0.6)
      .to(step, { autoAlpha: 1, y: 0, duration: 0.4 }, i + 0.8);
  });
}

/** Mobile: no pin, each step rises into place. */
function animateStackedChain() {
  gsap.set('[data-chain-progress]', { scaleX: 1 });
  gsap.utils.toArray<HTMLElement>('[data-chain-step]').forEach((step) => {
    gsap.from(step, {
      autoAlpha: 0,
      y: 40,
      duration: 1,
      ease: EASE,
      scrollTrigger: { trigger: step, start: 'top 85%' },
    });
  });
}

function animateReveals() {
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.from(batch, { autoAlpha: 0, y: 32, duration: 1, stagger: 0.1, ease: EASE }),
  });
}

/**
 * Runs the landing's motion over server-rendered markup (data attributes only). Nothing moves
 * when the visitor asks for reduced motion; every animation is reverted on unmount.
 */
export function LandingMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const media = gsap.matchMedia(scope);
    media.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        wide: PIN_BREAKPOINT,
      },
      (context) => {
        const { motion, wide } = context.conditions ?? {};
        if (!motion) {
          return;
        }
        animateHero();
        if (wide) {
          animatePinnedChain();
        } else {
          animateStackedChain();
        }
        animateReveals();
      },
    );
    return () => media.revert();
  }, []);

  return <div ref={scope}>{children}</div>;
}
