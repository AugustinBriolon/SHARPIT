'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'motion/react';
import { useThemePreference } from '@/providers/theme-provider';
import { cn } from '@/lib/utils';

/**
 * Liquid Glass chrome wrapper — tab bar, floating back, etc.
 *
 * Content cards, forms, and legal walls (`/consent`, `/privacy`, `/terms`)
 * must NOT use this. Readability first (Design / Privacy).
 *
 * Falls back to frosted CSS when reduced-motion is set or before mount.
 * `liquid-glass-react@1.1.1` (peer React >=19) — pin; elasticity forced to 0.
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

/** CSS frosted surface shared by fallback + reduced-motion paths. */
export const chromeGlassFallbackClass =
  'bg-background/80 supports-backdrop-filter:bg-background/70 backdrop-blur-xl border border-border/50 shadow-none';

function FallbackSurface({
  children,
  className,
  cornerRadius,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  cornerRadius: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(chromeGlassFallbackClass, className)}
      style={{
        borderRadius: cornerRadius >= 999 ? 9999 : cornerRadius,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function useChromeGlassReady(forceFallback: boolean): boolean {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return !forceFallback && !reduce && mounted;
}

function glassStyle(style: React.CSSProperties | undefined): React.CSSProperties {
  return {
    position: 'relative',
    top: 'auto',
    left: 'auto',
    ...style,
  };
}

export function ChromeGlass({
  children,
  className,
  cornerRadius = 24,
  forceFallback = false,
  padding = '0',
  style,
}: ChromeGlassProps) {
  const ready = useChromeGlassReady(forceFallback);
  const { resolved } = useThemePreference();
  const overLight = resolved === 'light';

  if (!ready) {
    return (
      <FallbackSurface className={className} cornerRadius={cornerRadius} style={style}>
        {children}
      </FallbackSurface>
    );
  }

  return (
    <LiquidGlass
      aberrationIntensity={overLight ? 1 : 1.5}
      blurAmount={0.08}
      className={cn(className)}
      cornerRadius={cornerRadius}
      displacementScale={overLight ? 36 : 48}
      elasticity={0}
      mode="standard"
      overLight={overLight}
      padding={padding}
      saturation={overLight ? 120 : 130}
      style={glassStyle(style)}
    >
      {children}
    </LiquidGlass>
  );
}
