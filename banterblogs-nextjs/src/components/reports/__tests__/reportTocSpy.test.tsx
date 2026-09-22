import { act, cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportTocSidebar } from '../ReportToc';
import { ACTIVATION_LINE, CURRENT_ATTRIBUTE, CURRENT_VALUE, MARKER_PLACED_ATTRIBUTE, REPORT_END_ATTRIBUTE, ReportTocSpy } from '../ReportTocSpy';

// The report contents follow the section being read: IntersectionObservers
// over the headings and the blocks between them (never a scroll listener) say
// what crosses the activation band; the spy marks one entry current and moves
// the marker to it by transform. Phase R4 (perf re-judge P1-3): the observer
// callbacks read no layout at all; what is in the band comes from the
// entries, and the one frame that follows reads the contents before it writes.

type Callback = (entries: IntersectionObserverEntry[]) => void;
type ObserverOptions = { rootMargin?: string };
const io = vi.hoisted(() => ({
  instances: [] as Array<{ callback: Callback; options?: ObserverOptions; observed: Set<Element>; disconnected: boolean }>,
}));

class RecordingObserver {
  observed = new Set<Element>();
  disconnected = false;
  constructor(
    public callback: Callback,
    public options?: ObserverOptions,
  ) {
    io.instances.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
  disconnect() {
    this.disconnected = true;
    this.observed.clear();
  }
  takeRecords() {
    return [];
  }
}

// each contents entry's offset inside the track
const ENTRY_TOP: Record<string, number> = { intro: 0, methods: 30, results: 60 };
const ENTRY_HEIGHT = 24;
const MARKER_HEIGHT = 16;
const IDS = Object.keys(ENTRY_TOP);

// jsdom lays nothing out: entries and the marker report the offsets above
const LAYOUT = {
  offsetTop: (el: HTMLElement) => (el.tagName === 'A' ? (ENTRY_TOP[el.getAttribute('href')?.slice(1) ?? ''] ?? 0) : 0),
  offsetHeight: (el: HTMLElement) => (el.tagName === 'A' ? ENTRY_HEIGHT : el.classList.contains('report-toc-marker') ? MARKER_HEIGHT : 0),
};
const ORIGINAL_LAYOUT = {
  offsetTop: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop'),
  offsetHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight'),
};

// frames run when the test says so
let frames: Array<(time: number) => void> = [];
const flushFrames = () =>
  act(() => {
    const due = frames;
    frames = [];
    due.forEach((cb) => cb(0));
  });

// the body's headings and blocks, each counting any geometry read
const geometryReads = { count: 0 };
function mountPage() {
  const body = document.createElement('div');
  for (const id of IDS) {
    const heading = document.createElement('h2');
    heading.id = id;
    const paragraph = document.createElement('p');
    paragraph.textContent = `${id} text`;
    body.append(heading, paragraph);
  }
  for (const el of body.children) {
    (el as HTMLElement).getBoundingClientRect = () => {
      geometryReads.count++;
      return new DOMRect();
    };
  }
  const end = document.createElement('div');
  end.setAttribute(REPORT_END_ATTRIBUTE, '');
  document.body.append(body, end);

  const view = render(
    <ReportTocSpy ids={IDS}>
      <ul>
        {IDS.map((id) => (
          <li key={id}>
            <a href={`#${id}`}>{id}</a>
          </li>
        ))}
      </ul>
    </ReportTocSpy>,
  );
  const marker = view.container.querySelector<HTMLElement>('.report-toc-marker')!;
  const heading = (id: string) => document.getElementById(id)!;
  const paragraphOf = (id: string) => heading(id).nextElementSibling!;
  return { ...view, marker, end, heading, paragraphOf };
}

const entry = (target: Element, isIntersecting: boolean) => ({ target, isIntersecting }) as IntersectionObserverEntry;
const current = (root: Element) => [...root.querySelectorAll(`a[${CURRENT_ATTRIBUTE}]`)].map((a) => [a.getAttribute('href'), a.getAttribute(CURRENT_ATTRIBUTE)]);
const centredOn = (id: string) => `translateY(${ENTRY_TOP[id] + (ENTRY_HEIGHT - MARKER_HEIGHT) / 2}px)`;
const [band, view, tail] = [() => io.instances[0], () => io.instances[1], () => io.instances[2]];
const cross = (observer: () => (typeof io.instances)[number], entries: IntersectionObserverEntry[]) => act(() => observer().callback(entries));

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', RecordingObserver);
  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    frames = [];
  });
  for (const key of ['offsetTop', 'offsetHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, key, {
      configurable: true,
      get(this: HTMLElement) {
        return LAYOUT[key](this);
      },
    });
  }
});

afterAll(() => {
  for (const key of ['offsetTop', 'offsetHeight'] as const) {
    const original = ORIGINAL_LAYOUT[key];
    if (original) Object.defineProperty(HTMLElement.prototype, key, original);
  }
  vi.unstubAllGlobals();
});

beforeEach(() => {
  io.instances.length = 0;
  frames = [];
  geometryReads.count = 0;
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('report contents scroll-spy', () => {
  it('watches the headings and every block between them in the band above the activation line and in the whole viewport, and the end of the report', () => {
    const { end } = mountPage();

    expect(band().options?.rootMargin).toBe(`0px 0px -${Math.round((1 - ACTIVATION_LINE) * 100)}% 0px`);
    expect(view().options?.rootMargin).toBeUndefined();
    // the blocks tile the body, so a jump that lands between headings still changes what is in the band
    for (const observer of [band(), view()]) {
      expect([...observer.observed].map((el) => el.id || el.tagName.toLowerCase())).toEqual(IDS.flatMap((id) => [id, 'p']));
    }
    expect([...tail().observed]).toEqual([end]);
  });

  it('marks the heading that enters the band current and places the marker on it without easing in', () => {
    const { container, marker, heading } = mountPage();

    cross(band, [entry(heading('intro'), true)]);
    flushFrames();
    expect(current(container)).toEqual([['#intro', CURRENT_VALUE]]);
    expect(marker.style.transform).toBe(centredOn('intro'));
    // placed on the next frame, which is what lets the CSS ease later moves
    flushFrames();
    expect(marker.hasAttribute(MARKER_PLACED_ATTRIBUTE)).toBe(true);
  });

  it('follows the last section in the band as headings cross the line, both ways', () => {
    const { container, marker, heading, paragraphOf } = mountPage();

    cross(band, [entry(heading('intro'), true), entry(paragraphOf('intro'), true)]);
    flushFrames();
    cross(band, [entry(heading('intro'), false), entry(heading('methods'), true)]);
    flushFrames();
    expect(current(container)).toEqual([['#methods', CURRENT_VALUE]]);
    expect(marker.style.transform).toBe(centredOn('methods'));

    cross(band, [entry(heading('methods'), false)]);
    flushFrames();
    expect(current(container)).toEqual([['#intro', CURRENT_VALUE]]);
  });

  it('reads the section of a block that fills the band after a jump between headings', () => {
    const { container, paragraphOf } = mountPage();

    cross(band, [entry(paragraphOf('methods'), true)]);
    flushFrames();
    expect(current(container)).toEqual([['#methods', CURRENT_VALUE]]);
  });

  it('reads the last section on screen once the end of the report is in view', () => {
    const { container, marker, heading, paragraphOf } = mountPage();

    cross(band, [entry(paragraphOf('methods'), true)]);
    cross(view, [entry(paragraphOf('methods'), true), entry(heading('results'), true)]);
    flushFrames();
    expect(current(container)).toEqual([['#methods', CURRENT_VALUE]]);

    cross(tail, [entry(document.querySelector(`[${REPORT_END_ATTRIBUTE}]`)!, true)]);
    flushFrames();
    expect(current(container)).toEqual([['#results', CURRENT_VALUE]]);
    expect(marker.style.transform).toBe(centredOn('results'));
  });

  it('reads no heading or block geometry, and applies a burst of crossings in one frame', () => {
    const { container, heading, paragraphOf } = mountPage();

    cross(band, [entry(heading('intro'), true)]);
    cross(band, [entry(paragraphOf('intro'), true)]);
    cross(band, [entry(heading('methods'), true)]);
    expect(frames).toHaveLength(1);
    flushFrames();

    expect(current(container)).toEqual([['#methods', CURRENT_VALUE]]);
    expect(geometryReads.count).toBe(0);
  });

  it('follows nothing while its sidebar is hidden (the phone layout)', () => {
    const body = document.createElement('div');
    for (const id of IDS) {
      const heading = document.createElement('h2');
      heading.id = id;
      body.append(heading);
    }
    document.body.append(body);
    const { container } = render(
      <nav style={{ display: 'none' }}>
        <ReportTocSpy ids={IDS}>
          <a href="#intro">intro</a>
          <a href="#methods">methods</a>
        </ReportTocSpy>
      </nav>,
    );
    cross(band, [entry(document.getElementById('methods')!, true)]);
    flushFrames();

    expect(current(container)).toEqual([]);
    expect(container.querySelector('.report-toc-marker')?.hasAttribute(MARKER_PLACED_ATTRIBUTE)).toBe(false);
  });

  it('never listens to scroll, and lets go of every observer and its frame on unmount', () => {
    const listen = vi.spyOn(window, 'addEventListener');
    const { unmount, heading } = mountPage();
    cross(band, [entry(heading('intro'), true)]);
    unmount();

    expect(listen.mock.calls.filter(([type]) => type === 'scroll')).toEqual([]);
    expect(io.instances.every((instance) => instance.disconnected)).toBe(true);
    expect(frames).toEqual([]);
    listen.mockRestore();
  });

  it('renders a hidden marker on the rail beside the sidebar list, which stays plain links without JavaScript', () => {
    const markup = renderToStaticMarkup(
      <ReportTocSidebar
        headings={[
          { id: 'a', text: 'A', level: 2 },
          { id: 'b', text: 'B', level: 2 },
          { id: 'c', text: 'C', level: 3 },
        ]}
      />,
    );
    const nav = new DOMParser().parseFromString(markup, 'text/html').querySelector('nav')!;

    expect(nav.querySelector('.report-toc-marker')?.getAttribute('aria-hidden')).toBe('true');
    expect(nav.querySelector('[data-toc-scroller] .report-toc-track .report-toc-list')).not.toBeNull();
    expect([...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['#a', '#b', '#c']);
    expect(nav.querySelector(`[${CURRENT_ATTRIBUTE}]`)).toBeNull();
  });
});
