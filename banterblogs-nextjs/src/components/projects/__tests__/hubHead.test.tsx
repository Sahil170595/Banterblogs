import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HubHead } from '../HubHead';
import { COLLECTIONS } from '@/lib/projects/collections';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/projects' } }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

// The hub and its collection pages share one head (the layout keeps it
// mounted across tab switches); a collection page names its collection in
// the h1, says in plain words what the collection holds, and counts its own
// projects rather than the whole catalog's.

const SYSTEMS_COUNT = 3;
const head = () =>
  renderToStaticMarkup(
    <HubHead
      collections={COLLECTIONS.map(({ key, title, description }) => ({ key, title, description, count: key === 'systems' ? SYSTEMS_COUNT : 1 }))}
      total={11}
      intro="The hub intro."
    />,
  );

afterEach(() => {
  pathname.current = '/projects';
});

describe('projects hub head', () => {
  it('titles the hub with its own line, intro and the whole catalog in numbers', () => {
    const html = head();
    expect(html).toMatch(/<h1[^>]*>.*Systems I Built,.*Running Live.*<\/h1>/);
    expect(html).toContain('The hub intro.');
    expect(html).toMatch(/11<\/span> projects/);
    expect(html).toMatch(/4<\/span> collections/);
  });

  it('titles a collection page with the collection, describes it and counts its own projects', () => {
    pathname.current = '/projects/systems';
    const html = head();
    expect(html).toMatch(/<h1[^>]*>Systems Projects<\/h1>/);
    expect(html).toContain(COLLECTIONS.find((c) => c.key === 'systems')!.description);
    expect(html).not.toContain('The hub intro.');
    expect(html).toMatch(new RegExp(`${SYSTEMS_COUNT}</span> projects in this collection`));
    expect(html).not.toContain('collections');
  });
});
