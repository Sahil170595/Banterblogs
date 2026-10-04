import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ForEngineers, ProjectMeta, ProjectPage } from '../ProjectPage';
import { readProjectCatalog } from '@/lib/projects/catalog';
import type { ProjectManifest } from '@/lib/projects/manifest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/projects',
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

// The project page reads in the order a visitor needs it: what the system is,
// what was found, then the demo, then the write-up with its engineering part
// set apart; the pager runs across the whole catalog.

const MANIFEST: ProjectManifest = {
  slug: 'send-pacing',
  title: 'Send Pacing Scheduler',
  dek: 'A scheduler.',
  summary: 'A card.',
  collection: 'systems',
  alsoIn: [],
  order: 2,
  evidence: 'synthetic-fixture',
  published: '2026-10-03',
  links: [{ label: 'Code for this page', url: 'https://github.com/Sahil170595/Banterblogs' }],
  builtWith: ['Python', 'NumPy'],
};

const page = (slug: string, checked?: string) =>
  renderToStaticMarkup(
    <ProjectPage slug={slug} demo={<p>the demo</p>} findings={[{ value: '3 of 3', label: 'filters dropped' }]} sections={[]} checked={checked}>
      <p>the write-up</p>
    </ProjectPage>,
  );

describe('project page', () => {
  it('states what was found before the demo', () => {
    const html = page('send-pacing');
    const found = html.indexOf('What I found');
    expect(found).toBeGreaterThan(-1);
    expect(found).toBeLessThan(html.indexOf('the demo'));
    expect(html.indexOf('the demo')).toBeLessThan(html.indexOf('the write-up'));
  });

  it('pages on past the end of a collection and back to it', () => {
    const catalog = readProjectCatalog();
    const at = catalog.findIndex((p, i) => catalog[i + 1] && catalog[i + 1].collection !== p.collection);
    const [lastInCollection, following] = [catalog[at], catalog[at + 1]];
    const html = page(lastInCollection.slug);
    expect(html).toContain(`href="/projects/${following.collection}/${following.slug}"`);
    expect(html).toMatch(new RegExp(`href="/projects/${lastInCollection.collection}"[^>]*>[^<]*All`));
  });
});

describe('project meta row', () => {
  it('names the author, the data, the check against the original and the stack', () => {
    const html = renderToStaticMarkup(<ProjectMeta project={MANIFEST} checked="Matches 11 of 11 recorded runs of the original" />);
    expect(html).toContain('Sahil Kadadekar');
    expect(html).toContain('Sample data');
    expect(html).toContain('Matches 11 of 11 recorded runs of the original');
    expect(html).toMatch(/Original built with[\s\S]*Python · NumPy/);
  });

  it('leaves out the check and the stack when a page has neither', () => {
    const html = renderToStaticMarkup(<ProjectMeta project={{ ...MANIFEST, builtWith: undefined }} />);
    expect(html).not.toContain('Matches');
    expect(html).not.toContain('built with');
  });
});

describe('the engineering part of a write-up', () => {
  it('opens on its own heading, in the contents, with a line saying what it holds', () => {
    const html = renderToStaticMarkup(
      <ForEngineers lede="How it works and how to run it.">
        <h3 id="how">How it works</h3>
      </ForEngineers>,
    );
    expect(html).toMatch(/<h2 id="engineers"[^>]*>For engineers<\/h2>/);
    expect(html).toContain('How it works and how to run it.');
    expect(html.indexOf('For engineers')).toBeLessThan(html.indexOf('How it works</h3>'));
  });
});
