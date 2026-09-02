'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'motion/react';
import { useThemePreference } from '@/providers/theme-provider';
import { cn } from '@/lib/utils';

/**
 * Liquid Glass chrome wrapper — tab bar, floating back, etc.
 *
 * Layout is owned by a stable outer box. `liquid-glass-react@1.1.1` is painted
 * as a non-interactive backdrop (`pointer-events-none`) so the library's
 * transform / top-left defaults cannot displace tap targets.
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

/** CSS frosted surface — always under interactive chrome for contrast. */
export const chromeGlassFallbackClass =
  'bg-background/80 supports-backdrop-filter:bg-background/70 backdrop-blur-xl border border-border/50 shadow-none';

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
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <LiquidGlass
        aberrationIntensity={overLight ? 1 : 1.5}
        blurAmount={0.08}
        className="!m-0 size-full"
        cornerRadius={cornerRadius}
        displacementScale={overLight ? 36 : 48}
        elasticity={0}
        mode="standard"
        overLight={overLight}
        padding="0"
        saturation={overLight ? 120 : 130}
        style={{
          height: '100%',
          left: 0,
          position: 'absolute',
          top: 0,
          transform: 'none',
          width: '100%',
        }}
      >
        <div className="size-full min-h-11" />
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
  const { resolved } = useThemePreference();
  const overLight = resolved === 'light';
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
