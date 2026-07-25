import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '../Header';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/' } }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

vi.mock('../SearchDialog', () => ({
  SearchDialog: () => null,
}));

describe('header landing wordmark', () => {
  beforeEach(() => {
    pathname.current = '/';
  });

  it('uses the orbital Chimeraforge wordmark on the landing page', () => {
    const html = renderToStaticMarkup(<Header />);

    expect(html).toContain('data-landing-wordmark="orbital"');
    expect(html).toContain('Chimeraforge');
    expect(html).not.toContain('>CF<');
  });

  it('keeps the established wordmark on interior pages', () => {
    pathname.current = '/reports';
    const html = renderToStaticMarkup(<Header />);

    expect(html).not.toContain('data-landing-wordmark="orbital"');
    expect(html).toContain('>CF<');
  });
});
