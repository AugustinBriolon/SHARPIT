import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Monitor, Moon, Sun } from 'lucide-react';
import { PreferenceRadioGroup } from '@/components/settings/preference-radio-group';

const OPTIONS = [
  { id: 'light', title: 'Clair', description: 'Diurne.', icon: Sun },
  { id: 'dark', title: 'Sombre', description: 'Nocturne.', icon: Moon },
  { id: 'system', title: 'Système', description: 'OS.', icon: Monitor },
] as const;

function renderGroup(value: 'light' | 'dark' | 'system') {
  return renderToStaticMarkup(
    createElement(PreferenceRadioGroup, {
      label: "Thème de l'application",
      options: OPTIONS,
      value,
      onChange: () => undefined,
    }),
  );
}

function buttonForTitle(html: string, title: string): string {
  const match = html.match(new RegExp(`<button\\b[^>]*>[\\s\\S]*?${title}[\\s\\S]*?</button>`));
  if (!match) {
    throw new Error(`No radio button found for "${title}"`);
  }
  return match[0];
}

describe('PreferenceRadioGroup', () => {
  it('marks only the stored preference as selected, including system', () => {
    const html = renderGroup('system');
    const light = buttonForTitle(html, 'Clair');
    const dark = buttonForTitle(html, 'Sombre');
    const system = buttonForTitle(html, 'Système');

    expect(light).toContain('aria-checked="false"');
    expect(light).not.toContain('border-highlight');
    expect(light).not.toContain('bg-highlight/30');

    expect(dark).toContain('aria-checked="false"');
    expect(dark).not.toContain('border-highlight');

    expect(system).toContain('aria-checked="true"');
    expect(system).toContain('border-highlight');
    expect(system).toContain('bg-highlight/30');
  });

  it('avoids analysis-panel so the active highlight utilities are not overridden', () => {
    expect(renderGroup('system')).not.toContain('analysis-panel');
  });
});
