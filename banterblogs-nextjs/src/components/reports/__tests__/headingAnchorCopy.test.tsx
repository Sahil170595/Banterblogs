import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderReportDocument, type ReportSection } from '@/lib/reports/content';
import { COPY_STATE_ATTRIBUTE, HEADING_LINK_FEEDBACK_MS, HeadingAnchorCopy } from '../HeadingAnchorCopy';
import { ReportMarkdown } from '../ReportMarkdown';

// Following a heading's anchor stays the browser's own fragment navigation
// (its history entry, its scroll, the pre-paint script's layout pass); the
// helper only copies the absolute URL and confirms it, on the anchor for the
// eye and in a live region for a screen reader. Without it the anchor is a
// plain link.

// the body's own fragment link stands for a contents link: a jump, not a copy
const DOC = '## Results\n\nWords.\n\n### Per-model rates\n\nMore words. [Elsewhere](#results).';

let writeText: ReturnType<typeof vi.fn>;
let body: string;

const anchor = (id: string) => document.querySelector<HTMLAnchorElement>(`#${id} > a.heading-anchor`)!;
const mount = () =>
  render(
    <>
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <HeadingAnchorCopy />
    </>,
  );
const click = async (el: Element, init: Parameters<typeof fireEvent.click>[1] = {}) => {
  let allowed = true;
  await act(async () => {
    allowed = fireEvent.click(el, init);
  });
  return allowed;
};

beforeEach(async () => {
  body = (await renderReportDocument(DOC, { headingAnchors: true })).html;
  vi.useFakeTimers();
  writeText = vi.fn(async () => undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('heading anchor copy', () => {
  it('copies the absolute URL of the section, marks the anchor and announces it, then clears both', async () => {
    mount();
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    expect(status.className).toContain('sr-only');

    const allowed = await click(anchor('results'));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(`${location.origin}${location.pathname}#results`);
    expect(anchor('results').getAttribute(COPY_STATE_ATTRIBUTE)).toBe('copied');
    // the announcement names the section; the anchor's own name does not
    expect(status.textContent).toBe('Copied link to section: Results');
    // the jump itself is left to the browser
    expect(allowed).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEADING_LINK_FEEDBACK_MS);
    });

    expect(anchor('results').hasAttribute(COPY_STATE_ATTRIBUTE)).toBe(false);
    expect(status.textContent).toBe('');
  });

  it('moves the mark to the anchor followed last', async () => {
    mount();

    await click(anchor('results'));
    await click(anchor('per-model-rates'));

    expect(writeText).toHaveBeenLastCalledWith(`${location.origin}${location.pathname}#per-model-rates`);
    expect(anchor('results').hasAttribute(COPY_STATE_ATTRIBUTE)).toBe(false);
    expect(anchor('per-model-rates').getAttribute(COPY_STATE_ATTRIBUTE)).toBe('copied');

    // the first click's timer does not clear the second's mark early
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEADING_LINK_FEEDBACK_MS - 1);
    });
    expect(anchor('per-model-rates').getAttribute(COPY_STATE_ATTRIBUTE)).toBe('copied');
  });

  it('says so when the clipboard refuses, instead of staying silent', async () => {
    writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mount();

    await click(anchor('results'));

    expect(anchor('results').getAttribute(COPY_STATE_ATTRIBUTE)).toBe('failed');
    expect(screen.getByRole('status').textContent).toBe('Could not copy link to section: Results');
    expect(error).toHaveBeenCalledWith('[HeadingAnchorCopy] clipboard write failed', expect.any(DOMException));
  });

  it('says so where there is no clipboard at all (an insecure origin)', async () => {
    Reflect.deleteProperty(navigator, 'clipboard');
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mount();

    await click(anchor('results'));

    expect(anchor('results').getAttribute(COPY_STATE_ATTRIBUTE)).toBe('failed');
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('leaves a modified click to the browser: a new tab is not a copy', async () => {
    mount();

    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) await click(anchor('results'), init);

    expect(writeText).not.toHaveBeenCalled();
    expect(anchor('results').hasAttribute(COPY_STATE_ATTRIBUTE)).toBe(false);
  });

  it('copies nothing for any other link', async () => {
    mount();

    await click(screen.getByRole('link', { name: 'Elsewhere' }));

    expect(writeText).not.toHaveBeenCalled();
  });

  it('stops listening once unmounted, and takes its mark with it', async () => {
    const { unmount } = mount();
    await click(anchor('results'));
    const followed = anchor('results');

    unmount();
    document.body.append(followed);
    await click(followed);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(followed.hasAttribute(COPY_STATE_ATTRIBUTE)).toBe(false);
    followed.remove();
  });
});

describe('report body', () => {
  const section = (key: string): ReportSection => ({
    id: key,
    title: key,
    html: body,
    markdown: DOC,
    sourceLabel: key,
    originKey: key,
    headings: [],
    frontMatter: null,
  });

  it('mounts one copier for all its documents, outside the HTML the pipeline wrote', async () => {
    render(<ReportMarkdown sections={[section('one'), section('two')]} />);

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status').closest('article')).toBeNull();
    expect(document.querySelectorAll('article .report-prose a.heading-anchor')).toHaveLength(4);

    await click(document.querySelector('#two a.heading-anchor[href="#per-model-rates"]')!);

    expect(writeText).toHaveBeenCalledWith(`${location.origin}${location.pathname}#per-model-rates`);
  });

  it('mounts nothing for a report with no body', () => {
    render(<ReportMarkdown sections={[]} />);

    expect(screen.queryByRole('status')).toBeNull();
  });
});
