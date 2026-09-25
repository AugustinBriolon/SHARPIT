'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DockedActionBar } from '@/components/ui/docked-action-bar';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { LinkButton } from '@/components/ui/link-button';
import {
  TEASER_BRAND,
  TEASER_CONTINUE_LABEL,
  TEASER_LEGAL_LINKS,
  TEASER_PRIMARY_CTA,
  TEASER_SCREENS,
  TEASER_SECONDARY_CTA,
} from '@/lib/teaser/screens';
import { cn } from '@/lib/utils';

/**
 * Public promise funnel (2–3 screens). Outside the auth app shell.
 * No Twin UI, no metrics, no liquid-glass. Light landing OK.
 */
export function TeaserFunnel() {
  const [index, setIndex] = useState(0);
  const screen = TEASER_SCREENS[index] ?? TEASER_SCREENS[0];
  const isLast = index >= TEASER_SCREENS.length - 1;

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pt-8 pb-6 sm:pt-12">
        <header className="flex items-center gap-2">
          <div className="icon-well size-8" aria-hidden>
            <Activity className="size-4" strokeWidth={2.25} />
          </div>
          <p className="text-page-title text-[1.25rem] leading-none tracking-tight">
            {TEASER_BRAND}
          </p>
        </header>

        <div
          key={screen.id}
          aria-live="polite"
          className="mt-10 flex flex-1 flex-col gap-6 max-sm:pb-56"
        >
          <EyebrowLabel>{screen.eyebrow}</EyebrowLabel>
          <h1 className="text-verdict text-balance sm:text-[1.75rem]">{screen.title}</h1>
          <p className="text-muted-foreground max-w-prose text-base leading-relaxed text-pretty">
            {screen.body}
          </p>
        </div>

        {/* Art. 13 transparency — legal pages reachable before signup (Privacy nit). */}
        <footer className="text-muted-foreground mt-6 flex flex-wrap gap-4 text-sm max-sm:pb-2">
          {TEASER_LEGAL_LINKS.map((item) => (
            <Link key={item.href} className="underline-offset-4 hover:underline" href={item.href}>
              {item.label}
            </Link>
          ))}
        </footer>

        {/* Progress + actions share the docked band so dots stay visible above CTAs on mobile. */}
        <DockedActionBar className="gap-3">
          <nav
            aria-label="Étapes du teaser"
            className="flex items-center justify-center gap-2 sm:order-first sm:mr-auto sm:justify-start"
          >
            {TEASER_SCREENS.map((step, i) => (
              <button
                key={step.id}
                aria-current={i === index ? 'step' : undefined}
                aria-label={`Écran ${i + 1} : ${step.eyebrow}`}
                type="button"
                className={cn(
                  'h-1.5 rounded-full transition-[width,background-color] duration-200',
                  i === index ? 'bg-foreground w-8' : 'bg-foreground/25 w-1.5',
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </nav>
          {isLast ? (
            <>
              <LinkButton
                className="w-full sm:w-auto sm:min-w-[12rem]"
                href={TEASER_PRIMARY_CTA.href}
                size="lg"
                variant="default"
              >
                {TEASER_PRIMARY_CTA.label}
              </LinkButton>
              <LinkButton
                className="w-full sm:w-auto"
                href={TEASER_SECONDARY_CTA.href}
                size="lg"
                variant="ghost"
              >
                {TEASER_SECONDARY_CTA.label}
              </LinkButton>
            </>
          ) : (
            <Button
              className="w-full sm:w-auto sm:min-w-[12rem]"
              size="lg"
              type="button"
              onClick={() => setIndex((v) => Math.min(v + 1, TEASER_SCREENS.length - 1))}
            >
              {TEASER_CONTINUE_LABEL}
            </Button>
          )}
        </DockedActionBar>
      </div>
    </div>
  );
}
