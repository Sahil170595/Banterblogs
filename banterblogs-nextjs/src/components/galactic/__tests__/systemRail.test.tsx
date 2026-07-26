import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemRail } from '../SystemRail';
import { STAR_SYSTEMS } from '../systems';

describe('galactic system rail', () => {
  it('renders every destination and marks the tracked system', () => {
    const active = STAR_SYSTEMS[3];
    const html = renderToStaticMarkup(
      <SystemRail activeSystem={active} onPreview={vi.fn()} onSelect={vi.fn()} />,
    );

    for (const system of STAR_SYSTEMS) {
      expect(html).toContain(system.name);
      expect(html).toContain(`href="${system.href}"`);
    }
    expect(html).toContain('aria-current="step"');
    expect(html).toContain(active.blurb);
  });

  it('uses one labelled navigation surface without a noisy live region', () => {
    const html = renderToStaticMarkup(
      <SystemRail activeSystem={STAR_SYSTEMS[0]} onPreview={vi.fn()} onSelect={vi.fn()} />,
    );

    expect(html).toContain('aria-label="Systems orbiting the Chimera core"');
    expect(html).not.toContain('aria-live');
  });

  it('selects on a plain click and preserves modified-link behavior', () => {
    const onSelect = vi.fn();
    const { getByRole } = render(
      <SystemRail
        activeSystem={STAR_SYSTEMS[0]}
        onPreview={vi.fn()}
        onSelect={onSelect}
      />,
    );
    const link = getByRole('link', { name: `01 — ${STAR_SYSTEMS[0].name}` });
    link.addEventListener('click', (event) => event.preventDefault());

    fireEvent.click(link);
    expect(onSelect).toHaveBeenCalledWith(STAR_SYSTEMS[0], link);

    onSelect.mockClear();
    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { shiftKey: true });
    fireEvent.click(link, { altKey: true });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('previews the linked system on pointer and keyboard focus', () => {
    const onPreview = vi.fn();
    const { getByRole } = render(
      <SystemRail
        activeSystem={STAR_SYSTEMS[0]}
        onPreview={onPreview}
        onSelect={vi.fn()}
      />,
    );
    const link = getByRole('link', { name: `01 — ${STAR_SYSTEMS[0].name}` });

    fireEvent.mouseEnter(link);
    fireEvent.mouseLeave(link);
    fireEvent.focus(link);
    fireEvent.blur(link);

    expect(onPreview.mock.calls).toEqual([
      [STAR_SYSTEMS[0].name, true],
      [STAR_SYSTEMS[0].name, false],
      [STAR_SYSTEMS[0].name, true],
      [STAR_SYSTEMS[0].name, false],
    ]);
  });
});
