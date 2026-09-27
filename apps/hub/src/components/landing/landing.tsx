import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { BrandMark } from '@sharpit/ui/components/ui/brand-mark';
import { buttonVariants } from '@sharpit/ui/components/ui/button';
import {
  LANDING_CHAIN,
  LANDING_CLOSING,
  LANDING_FOOTER_LINKS,
  LANDING_HERO,
  LANDING_PILLARS,
  LANDING_SOURCES,
} from '@sharpit/app/lib/landing/landing-copy';
import { cn } from '@sharpit/app/lib/utils';
import { LandingMotion } from './landing-motion';

const HEADING = 'font-[family-name:var(--font-heading)] font-semibold tracking-[-0.035em]';
const DATA = 'font-[family-name:var(--font-data)] tabular-nums';
const RULER_TICKS = 49;

function Brand() {
  return (
    <span className="flex items-center gap-2">
      <span className="brand-tile size-7" aria-hidden>
        <BrandMark className="size-3.5" />
      </span>
      <span className={cn(HEADING, 'text-base tracking-tight')}>SHARPIT</span>
    </span>
  );
}

/** Instrument ruler: a day read as a scale, the marker settles on the morning decision. */
function Ruler() {
  return (
    <div className="relative mt-16 w-full sm:mt-24" aria-hidden data-hero-fade>
      <div className="flex h-10 items-end justify-between">
        {Array.from({ length: RULER_TICKS }, (_, i) => (
          <span
            key={i}
            className={cn(
              'bg-foreground/30 w-px origin-bottom',
              i % 6 === 0 ? 'bg-foreground/70 h-10' : 'h-4',
            )}
            data-tick
          />
        ))}
      </div>
      <div className="absolute -top-7 left-[29%] -translate-x-1/2" data-marker>
        <span
          className={cn(
            DATA,
            'bg-highlight text-highlight-foreground rounded px-1.5 py-0.5 text-[0.6875rem]',
          )}
        >
          07:00
        </span>
      </div>
      <div className={cn(DATA, 'text-muted-foreground mt-3 flex justify-between text-[0.6875rem]')}>
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-dvh flex-col justify-center pt-24 pb-16" data-hero>
      <div data-hero-body>
        <p className="text-label text-muted-foreground" data-hero-fade>
          {LANDING_HERO.eyebrow}
        </p>
        <h1 className={cn(HEADING, 'mt-6 text-[clamp(2.6rem,8.5vw,6.5rem)] leading-[0.95]')}>
          {LANDING_HERO.titleLines.map((line) => (
            <span key={line} className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
              <span className="block" data-hero-line>
                {line}
              </span>
            </span>
          ))}
        </h1>
        <p
          className="text-muted-foreground mt-8 max-w-xl text-lg leading-relaxed text-pretty"
          data-hero-fade
        >
          {LANDING_HERO.body}
        </p>
        <div className="mt-10 flex flex-wrap gap-3" data-hero-fade>
          <a
            className={buttonVariants({ size: 'lg', className: 'px-5' })}
            href={LANDING_HERO.primaryCta.href}
          >
            {LANDING_HERO.primaryCta.label}
          </a>
          <a
            className={buttonVariants({ size: 'lg', variant: 'ghost', className: 'px-5' })}
            href={LANDING_HERO.secondaryCta.href}
          >
            {LANDING_HERO.secondaryCta.label}
            <ArrowUpRight data-icon="inline-end" />
          </a>
        </div>
      </div>
      <Ruler />
    </section>
  );
}

function Chain() {
  return (
    <section aria-label="Le principe" className="relative" data-chain>
      <div className="flex min-h-dvh flex-col justify-center py-24">
        <div className="border-foreground/15 flex items-center gap-4 border-t pt-4">
          <span className={cn(DATA, 'text-muted-foreground text-xs')} data-chain-counter>
            01 / 03
          </span>
          <span className="bg-foreground/10 relative h-px flex-1 overflow-hidden">
            <span className="bg-foreground absolute inset-0 origin-left" data-chain-progress />
          </span>
        </div>
        {/* Stacked on one stage only when the pinned hand-over runs (wide screen, motion allowed). */}
        <div className="mt-16 grid gap-20 motion-safe:md:gap-0 motion-safe:md:[grid-template-areas:'stack']">
          {LANDING_CHAIN.map((step) => (
            <article
              key={step.index}
              className="motion-safe:md:[grid-area:stack] motion-safe:md:not-first:opacity-0"
              data-chain-step
            >
              <p className="text-label text-muted-foreground flex gap-3">
                <span className={DATA}>{step.index}</span>
                {step.label}
              </p>
              <h2
                className={cn(
                  HEADING,
                  'mt-6 max-w-3xl text-[clamp(2rem,5.5vw,4.25rem)] leading-[1]',
                )}
              >
                {step.title}
              </h2>
              <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed text-pretty">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section aria-label="Endurance" className="py-24 sm:py-32">
      <ul className="border-foreground/15 border-t">
        {LANDING_PILLARS.map((pillar, i) => (
          <li
            key={pillar.label}
            className="border-foreground/15 grid gap-2 border-b py-8 sm:grid-cols-[4rem_14rem_1fr] sm:items-baseline sm:gap-6"
            data-reveal
          >
            <span className={cn(DATA, 'text-muted-foreground text-xs')}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className={cn(HEADING, 'text-2xl sm:text-3xl')}>{pillar.label}</span>
            <span className="text-muted-foreground text-base leading-relaxed">{pillar.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Sources() {
  return (
    <section aria-label={LANDING_SOURCES.title} className="py-16 sm:py-24">
      <p className="text-label text-muted-foreground" data-reveal>
        {LANDING_SOURCES.title}
      </p>
      <ul className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
        {LANDING_SOURCES.connected.map((name) => (
          <li
            key={name}
            className={cn(HEADING, 'text-[clamp(1.75rem,4.5vw,3.25rem)] leading-none')}
            data-reveal
          >
            {name}
          </li>
        ))}
      </ul>
      <p
        className="text-muted-foreground mt-8 flex flex-wrap items-baseline gap-x-4 text-lg"
        data-reveal
      >
        <span className={cn(DATA, 'text-xs uppercase')}>{LANDING_SOURCES.upcomingLabel}</span>
        {LANDING_SOURCES.upcoming.join(' · ')}
      </p>
    </section>
  );
}

function Closing() {
  return (
    <section className="py-16 sm:py-24">
      <div className="surface-ink px-6 py-20 sm:px-12 sm:py-28" data-reveal>
        <h2 className={cn(HEADING, 'max-w-3xl text-[clamp(2rem,5.5vw,4rem)] leading-[1]')}>
          {LANDING_CLOSING.title}
        </h2>
        <a
          className={buttonVariants({ size: 'lg', variant: 'highlight', className: 'mt-10 px-5' })}
          href={LANDING_CLOSING.cta.href}
        >
          {LANDING_CLOSING.cta.label}
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-foreground/15 text-muted-foreground flex flex-wrap items-center justify-between gap-4 border-t py-8 text-sm">
      <span className={DATA}>SHARPIT</span>
      <nav className="flex gap-5">
        {LANDING_FOOTER_LINKS.map((link) => (
          <Link key={link.href} className="underline-offset-4 hover:underline" href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}

/** sharpit.app: the public landing. Markup only; motion lives in `LandingMotion`. */
export function Landing() {
  return (
    <LandingMotion>
      <header className="bg-background/80 fixed inset-x-0 top-0 z-10 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <a
            className={buttonVariants({ size: 'sm', variant: 'ghost' })}
            href={LANDING_HERO.signIn.href}
          >
            {LANDING_HERO.signIn.label}
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <Hero />
        <Chain />
        <Pillars />
        <Sources />
        <Closing />
        <Footer />
      </main>
    </LandingMotion>
  );
}
