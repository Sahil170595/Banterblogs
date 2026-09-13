import { act, cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportTocSidebar } from '../ReportToc';
import { ACTIVATION_LINE, CURRENT_ATTRIBUTE, CURRENT_VALUE, MARKER_PLACED_ATTRIBUTE, REPORT_END_ATTRIBUTE, ReportTocSpy } from '../ReportTocSpy';

// The report contents follow the section being read: an IntersectionObserver
// over the headings (never a scroll listener) marks one entry current and
// moves the marker to it by transform.

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

const VIEWPORT = 1000;
// page offsets of three headings, and of each contents entry inside the track
const HEADING_TOP: Record<string, number> = { intro: 200, methods: 1400, results: 2600 };
const ENTRY_TOP: Record<string, number> = { intro: 0, methods: 30, results: 60 };
const ENTRY_HEIGHT = 24;
const MARKER_HEIGHT = 16;
const IDS = Object.keys(HEADING_TOP);
let scrolled = 0;

const rect = (top: number) => ({ top, bottom: top + 30, left: 0, right: 100, width: 100, height: 30, x: 0, y: top, toJSON: () => ({}) });

// jsdom lays nothing out: entries and the marker report the offsets above,
// in place before the spy's first placement runs on mount
const LAYOUT = {
  offsetTop: (el: HTMLElement) => (el.tagName === 'A' ? (ENTRY_TOP[el.getAttribute('href')?.slice(1) ?? ''] ?? 0) : 0),
  offsetHeight: (el: HTMLElement) => (el.tagName === 'A' ? ENTRY_HEIGHT : el.classList.contains('report-toc-marker') ? MARKER_HEIGHT : 0),
};
const ORIGINAL_LAYOUT = {
  offsetTop: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop'),
  offsetHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight'),
};

// a body of headings with a paragraph under each, and the end marker after it
function mountPage() {
  const body = document.createElement('div');
  for (const id of IDS) {
    const heading = document.createElement('h2');
    heading.id = id;
    heading.getBoundingClientRect = () => rect(HEADING_TOP[id] - scrolled);
    const paragraph = document.createElement('p');
    paragraph.textContent = `${id} text`;
    body.append(heading, paragraph);
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
  return { ...view, marker, end };
}

const current = (root: Element) => [...root.querySelectorAll(`a[${CURRENT_ATTRIBUTE}]`)].map((a) => [a.getAttribute('href'), a.getAttribute(CURRENT_ATTRIBUTE)]);
const centredOn = (id: string) => `translateY(${ENTRY_TOP[id] + (ENTRY_HEIGHT - MARKER_HEIGHT) / 2}px)`;
const [band, tail] = [() => io.instances[0], () => io.instances[1]];

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', RecordingObserver);
  vi.stubGlobal('innerHeight', VIEWPORT);
  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
    cb(0);
    return 1;
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
  scrolled = 0;
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('report contents scroll-spy', () => {
  it('watches the headings and every block between them from the band above the activation line, and the end of the report', () => {
    const { end } = mountPage();

    expect(band().options?.rootMargin).toBe(`0px 0px -${Math.round((1 - ACTIVATION_LINE) * 100)}% 0px`);
    // the blocks tile the body, so a jump that lands between headings still changes what is in the band
    expect([...band().observed].map((el) => el.id || el.tagName.toLowerCase())).toEqual(IDS.flatMap((id) => [id, 'p']));
    expect([...tail().observed]).toEqual([end]);
  });

  it('marks the heading past the line current and places the marker on it without easing in', () => {
    const { container, marker } = mountPage();

    expect(current(container)).toEqual([['#intro', CURRENT_VALUE]]);
    expect(marker.style.transform).toBe(centredOn('intro'));
    // placed on the next frame, which is what lets the CSS ease later moves
    expect(marker.hasAttribute(MARKER_PLACED_ATTRIBUTE)).toBe(true);
  });

  it('moves the one current entry and the marker as a new heading crosses the line', () => {
    const { container, marker } = mountPage();

    scrolled = 1200;
    act(() => band().callback([]));
    expect(current(container)).toEqual([['#methods', CURRENT_VALUE]]);
    expect(marker.style.transform).toBe(centredOn('methods'));

    scrolled = 0;
    act(() => band().callback([]));
    expect(current(container)).toEqual([['#intro', CURRENT_VALUE]]);
  });

  it('reads the last section on screen once the end of the report is in view', () => {
    const { container, marker } = mountPage();

    scrolled = 1900; // results sits at 700px, below the line
    act(() => band().callback([]));
    expect(current(container)).toEqual([['#methods', CURRENT_VALUE]]);

    act(() => tail().callback([{ isIntersecting: true } as IntersectionObserverEntry]));
    expect(current(container)).toEqual([['#results', CURRENT_VALUE]]);
    expect(marker.style.transform).toBe(centredOn('results'));
  });

  it('never listens to scroll, and lets go of both observers on unmount', () => {
    const listen = vi.spyOn(window, 'addEventListener');
    const { unmount } = mountPage();
    unmount();

    expect(listen.mock.calls.filter(([type]) => type === 'scroll')).toEqual([]);
    expect(io.instances.every((instance) => instance.disconnected)).toBe(true);
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
