import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportCitation } from '@/lib/citation';
import { CiteBlock } from '../CiteBlock';

// CiteBlock is a closed disclosure holding a citation twice: as a line of
// plain text and as BibTeX in a mono block, each with the shared copy button.
// It is a native <details> with both texts in the server HTML, so without
// JavaScript it still opens and its text can be selected.

const CITATION = reportCitation({ slug: 'technical-report-119', title: 'TR119: Cost & Energy Analysis', date: '2025-12-21' });
const SUBJECT = 'TR119';

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn(async () => undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'clipboard');
});

const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);

describe('cite block', () => {
  it('is a closed native disclosure, named for what it cites', () => {
    const { container } = render(<CiteBlock citation={CITATION} subject={SUBJECT} />);
    const details = container.querySelector('details')!;
    const summary = details.querySelector(':scope > summary')!;

    expect(details.open).toBe(false);
    expect(summary.textContent).toBe(`Cite: ${SUBJECT}`);
    // the eye reads "Cite"; the subject is for a screen reader, which meets several on /papers
    expect(summary.querySelector('.sr-only')?.textContent).toBe(`: ${SUBJECT}`);
  });

  it('takes another visible label where one control stands alone', () => {
    const { container } = render(<CiteBlock citation={CITATION} subject={SUBJECT} label="Cite this report" />);

    expect(container.querySelector('summary')!.textContent).toBe(`Cite this report: ${SUBJECT}`);
  });

  it('holds the plain citation and the BibTeX, character for character, in the server HTML', () => {
    const markup = renderToStaticMarkup(<CiteBlock citation={CITATION} subject={SUBJECT} />);
    const body = new DOMParser().parseFromString(markup, 'text/html').body;

    expect(body.querySelector('details pre > code')?.textContent).toBe(CITATION.bibtex);
    expect(body.querySelector('details p')?.textContent).toBe(CITATION.text);
    // TeX's escapes survive the HTML
    expect(body.querySelector('pre')?.textContent).toContain(String.raw`Cost \& Energy Analysis`);
  });

  it('sets the BibTeX in mono and wraps it, so a long line never widens the page', () => {
    const { container } = render(<CiteBlock citation={CITATION} subject={SUBJECT} />);
    const pre = container.querySelector('pre')!;

    expect(classes(pre)).toEqual(expect.arrayContaining(['font-mono', 'whitespace-pre-wrap', 'break-words', 'min-w-0']));
    expect(classes(pre).filter((c) => /^overflow-x-|^whitespace-nowrap$/.test(c))).toEqual([]);
    expect(classes(container.querySelector('details')!)).toContain('min-w-0');
  });

  it('copies each form with the shared copy button, named for the form and the subject', async () => {
    const { container } = render(<CiteBlock citation={CITATION} subject={SUBJECT} />);
    const panel = within(container.querySelector('details')!);

    await act(async () => {
      fireEvent.click(panel.getByRole('button', { name: `Copy BibTeX for ${SUBJECT}`, hidden: true }));
    });
    expect(writeText).toHaveBeenLastCalledWith(CITATION.bibtex);
    expect(panel.getAllByRole('status', { hidden: true }).map((status) => status.textContent)).toContain(`Copied BibTeX for ${SUBJECT}`);

    await act(async () => {
      fireEvent.click(panel.getByRole('button', { name: `Copy citation for ${SUBJECT}`, hidden: true }));
    });
    expect(writeText).toHaveBeenLastCalledWith(CITATION.text);
  });

  it('holds no link, and sits above a card’s stretched link so its text can be selected', () => {
    const { container } = render(<CiteBlock citation={CITATION} subject={SUBJECT} className="mt-4" />);
    const details = container.querySelector('details')!;

    expect(details.querySelectorAll('a')).toHaveLength(0);
    expect(classes(details)).toEqual(expect.arrayContaining(['relative', 'mt-4']));
  });

  it('is the site’s one disclosure (.more-details in globals.css): its quiet summary, its chevron, its focus ring', () => {
    const { container } = render(<CiteBlock citation={CITATION} subject={SUBJECT} />);
    const details = container.querySelector('details')!;
    const chevron = details.querySelector('summary > svg')!;

    expect(classes(details)).toContain('more-details');
    expect(classes(chevron)).toContain('more-chevron');
    expect(chevron.getAttribute('aria-hidden')).toBe('true');
    // the summary takes its look from the shared rule, not from classes of its own
    expect(details.querySelector('summary')!.hasAttribute('class')).toBe(false);
    // no ember at rest
    expect([...container.querySelectorAll('*')].flatMap(classes).filter((c) => /primary/.test(c) && !c.startsWith('hover:'))).toEqual([]);
  });
});
