import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../Header';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/' } }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn() }),
}));

// header.test.tsx stubs the search out; here the bar is rendered whole, as
// the server sends it. The closed search panel sits right after the wordmark,
// and until this test it served its "Loading…" state on every page.
const NAV_LABELS = ['Platform', 'Research', 'Papers', 'Projects', 'Tools', 'Show', 'Work', 'About'];
const textOf = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

describe('header server HTML', () => {
  it.each(['/', '/reports', '/reports/technical-report-138'])('on %s reads as the wordmark and the navigation, nothing from the closed search', (route) => {
    pathname.current = route;
    const html = renderToStaticMarkup(<Header />);

    // the search field is there, closed
    expect(html).toMatch(/<input[^>]*role="combobox"[^>]*aria-expanded="false"/);
    expect(textOf(html)).not.toMatch(/loading/i);
    expect(textOf(html)).toBe(`Chimeraforge ${NAV_LABELS.join(' ')}`);
  });
});
