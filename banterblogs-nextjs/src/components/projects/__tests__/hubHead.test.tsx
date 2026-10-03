import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HubHead } from '../HubHead';
import { COLLECTIONS } from '@/lib/projects/collections';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/projects' } }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

// The hub and its collection pages share one head (the layout keeps it
// mounted across tab switches); a collection page names its collection in
// the h1 and says in plain words what the collection holds.

const head = () => renderToStaticMarkup(<HubHead collections={COLLECTIONS.map(({ key, title, description }) => ({ key, title, description }))} intro="The hub intro." />);

afterEach(() => {
  pathname.current = '/projects';
});

describe('projects hub head', () => {
  it('titles the hub with its own line and intro', () => {
    const html = head();
    expect(html).toMatch(/<h1[^>]*>.*Systems I Built,.*Running Live.*<\/h1>/);
    expect(html).toContain('The hub intro.');
  });

  it('titles a collection page with the collection and describes it', () => {
    pathname.current = '/projects/systems';
    const html = head();
    expect(html).toMatch(/<h1[^>]*>Systems Projects<\/h1>/);
    expect(html).toContain(COLLECTIONS.find((c) => c.key === 'systems')!.description);
    expect(html).not.toContain('The hub intro.');
  });
});
