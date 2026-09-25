'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * Liquid Glass chrome wrapper — tab bar, floating back, etc.
 *
 * Layout is owned by a stable outer box. `liquid-glass-react@1.1.1` is painted
 * as a non-interactive backdrop (`pointer-events-none`) so the library's
 * transform / top-left defaults cannot displace tap targets.
 *
 * Theme is read from `document.documentElement.classList` (no ThemeProvider
 * required — skeletons / SSR tests stay safe).
 *
 * Content cards, forms, and legal walls (`/consent`, `/privacy`, `/terms`)
 * must NOT use this.
 */

const LiquidGlass = dynamic(() => import('liquid-glass-react'), { ssr: false });

export type ChromeGlassProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  cornerRadius?: number;
  padding?: string;
  forceFallback?: boolean;
};

/**
 * CSS frosted surface — always under interactive chrome for contrast.
 * Light cream canvas: stronger border + blur so glass does not read as flat white.
 */
export const chromeGlassFallbackClass =
  'bg-background/72 supports-backdrop-filter:bg-background/58 backdrop-blur-2xl border border-foreground/14 dark:border-border/50 dark:bg-background/80 dark:supports-backdrop-filter:dark:bg-background/70 dark:backdrop-blur-xl shadow-none';

function subscribeDarkClass(onStoreChange: () => void): () => void {
  if (typeof document === 'undefined') {
    return () => undefined;
  }
  const root = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function isDarkClass(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return document.documentElement.classList.contains('dark');
}

/** Light canvas → overLight glass; dark canvas → deeper refraction. */
function useOverLight(): boolean {
  const dark = useSyncExternalStore(subscribeDarkClass, isDarkClass, () => false);
  return !dark;
}

function useChromeGlassReady(forceFallback: boolean): boolean {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return !forceFallback && !reduce && mounted;
}

function GlassBackdrop({ cornerRadius, overLight }: { cornerRadius: number; overLight: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <LiquidGlass
        aberrationIntensity={overLight ? 1.15 : 1.5}
        blurAmount={overLight ? 0.12 : 0.08}
        className="!m-0 size-full !transform-none"
        cornerRadius={cornerRadius}
        displacementScale={overLight ? 42 : 48}
        elasticity={0}
        mode="standard"
        mouseContainer={null}
        overLight={overLight}
        padding="0"
        saturation={overLight ? 125 : 130}
        style={{
          height: '100%',
          left: 0,
          margin: 0,
          position: 'absolute',
          top: 0,
          transform: 'none',
          width: '100%',
        }}
      >
        {/* Empty content — glass is backdrop only; avoid a second floating orb glyph. */}
        <div className="size-full" />
      </LiquidGlass>
    </div>
  );
}

export function ChromeGlass({
  children,
  className,
  cornerRadius = 24,
  forceFallback = false,
  style,
}: ChromeGlassProps) {
  const ready = useChromeGlassReady(forceFallback);
  const overLight = useOverLight();
  const radius = cornerRadius >= 999 ? 9999 : cornerRadius;

  return (
    <div
      className={cn(chromeGlassFallbackClass, 'relative overflow-hidden', className)}
      style={{ borderRadius: radius, ...style }}
    >
      {ready ? <GlassBackdrop cornerRadius={cornerRadius} overLight={overLight} /> : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
