import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReportTocMobile, ReportTocSidebar } from '../ReportToc';

const LONG = 'Audit-layer flip adjudication + 7,257-sample reduced replication on enriched 187-prompt subset';
const HEADINGS = [
  { id: 'audit', text: LONG, level: 2 },
  { id: 'positioning', text: 'Positioning', level: 2 },
  { id: 'methods', text: 'Methods', level: 3 },
];

function linkFor(html: string, id: string): Element {
  const link = new DOMParser().parseFromString(html, 'text/html').querySelector(`a[href="#${id}"]`);
  if (!link) throw new Error(`no TOC link for #${id}`);
  return link;
}

describe('report table of contents', () => {
  it('truncates long sidebar labels near 48 characters and keeps the full text in title', () => {
    const link = linkFor(renderToStaticMarkup(<ReportTocSidebar headings={HEADINGS} />), 'audit');
    expect(link.textContent?.length).toBeLessThanOrEqual(49);
    expect(link.textContent?.endsWith('…')).toBe(true);
    expect(link.getAttribute('title')).toBe(LONG);
  });

  it('leaves short sidebar labels untouched and untitled', () => {
    const link = linkFor(renderToStaticMarkup(<ReportTocSidebar headings={HEADINGS} />), 'positioning');
    expect(link.textContent).toBe('Positioning');
    expect(link.hasAttribute('title')).toBe(false);
  });

  it('keeps full labels in the mobile list, where no hover reveals a title', () => {
    const link = linkFor(renderToStaticMarkup(<ReportTocMobile headings={HEADINGS} />), 'audit');
    expect(link.textContent).toBe(LONG);
  });
});
