import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemEdgeBlur } from '@/components/layout/shell/system-edge-blur';

const APP_SHELL = fs.readFileSync(
  path.join(process.cwd(), 'src/components/layout/shell/app-shell.tsx'),
  'utf8',
);

const ROOT_LAYOUT = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');

const ADR_039 = fs.readFileSync(
  path.join(process.cwd(), 'docs/adr/ADR-039-ios-system-edge-fade.md'),
  'utf8',
);

describe('AppShell iOS top edge — what is actually possible', () => {
  it('forces readable content below the status strip with inline paddingTop', () => {
    expect(APP_SHELL).toContain("paddingTop: 'max(3.5rem, env(safe-area-inset-top, 0px))'");
    expect(APP_SHELL).toContain('data-safe-page-top');
    expect(APP_SHELL).toContain('min-h-dvh');
    expect(APP_SHELL).not.toContain('overflow-y-auto');
  });

  it('does not mount a SystemEdgeBlur overlay that clips the first heading', () => {
    expect(APP_SHELL).not.toContain('<SystemEdgeBlur');
    expect(renderToStaticMarkup(createElement(SystemEdgeBlur))).toBe('');
  });

  it('keeps black-translucent + viewport-fit cover for standalone', () => {
    expect(ROOT_LAYOUT).toContain("statusBarStyle: 'black-translucent'");
    expect(ROOT_LAYOUT).toContain("viewportFit: 'cover'");
  });

  it('documents the possibility limit in ADR-039', () => {
    expect(ADR_039).toContain('Not possible in Safari tabs');
    expect(ADR_039).toContain('inline');
  });
});
