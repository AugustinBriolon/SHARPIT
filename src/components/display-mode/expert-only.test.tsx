import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ExpertOnly } from '@/components/display-mode/expert-only';

const mockUseDisplayMode = vi.fn();

vi.mock('@/providers/display-mode-provider', () => ({
  useDisplayMode: () => mockUseDisplayMode(),
}));

describe('ExpertOnly', () => {
  it('renders fallback while the density is unresolved', () => {
    mockUseDisplayMode.mockReturnValue({
      mode: 'essential',
      isExpert: false,
      isResolved: false,
      setMode: () => {},
    });

    const html = renderToStaticMarkup(
      <ExpertOnly fallback={<span>waiting</span>}>expert</ExpertOnly>,
    );
    expect(html).toContain('waiting');
    expect(html).not.toContain('expert');
  });

  it('hides children on the essential reading', () => {
    mockUseDisplayMode.mockReturnValue({
      mode: 'essential',
      isExpert: false,
      isResolved: true,
      setMode: () => {},
    });

    const html = renderToStaticMarkup(<ExpertOnly>secret</ExpertOnly>);
    expect(html).toBe('');
  });

  it('shows children on the expert reading', () => {
    mockUseDisplayMode.mockReturnValue({
      mode: 'expert',
      isExpert: true,
      isResolved: true,
      setMode: () => {},
    });

    const html = renderToStaticMarkup(<ExpertOnly>secret</ExpertOnly>);
    expect(html).toContain('secret');
  });
});
