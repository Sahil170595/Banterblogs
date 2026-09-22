import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANCHOR_ENTRIES_KEPT,
  ANCHOR_RENDER_MARGIN_VIEWS,
  ANCHOR_VIEWPORT_SHARE,
  currentEntryKey,
  forgetScrollAnchors,
  holdScrollAnchor,
  rememberScrollAnchor,
  restoreScrollAnchor,
  watchScrollAnchors,
} from '../scrollAnchor';

// R6 bug 2: Back restores a page's scroll position as a number, into a page
// rendered afresh with its off-screen blocks skipped at estimated heights
// (contentVisibility.ts). The same scrollY then showed other content: the
// /reports archive 75px off, TR142 2,125px off (Chromium, 1440). Each
// history entry keeps the block at the top of the view and its offset, taken
// as the reader leaves; after a traversal renders the page again, that block
// goes back to the same offset, whatever the blocks above it measure.

const VIEW_HEIGHT = 900;
let y = 0;
const scrollTo = vi.fn((options: { top?: number; left?: number; behavior?: string }) => {
  y = options.top ?? y;
});

interface Box {
  tag?: string;
  className?: string;
  top: number;
  height: number;
  style?: string;
  kids?: Box[];
}

// jsdom lays nothing out: each element answers with the box it is given.
// Its layout top is offsetTop (offsetParent is null in jsdom); its drawn
// rectangle may be moved by `shift`, as a transform would.
function build(parent: Element, boxes: Box[], shift = 0) {
  for (const box of boxes) {
    const el = document.createElement(box.tag ?? 'div');
    if (box.className) el.className = box.className;
    if (box.style) el.setAttribute('style', box.style);
    Object.defineProperty(el, 'offsetTop', { configurable: true, get: () => box.top });
    el.getBoundingClientRect = () => {
      const top = box.top - y + shift;
      return { top, bottom: top + box.height, height: box.height, left: 0, right: 100, width: 100, x: 0, y: top, toJSON: () => ({}) };
    };
    parent.append(el);
    if (box.kids) build(el, box.kids, shift);
  }
}

const mount = (boxes: Box[], shift = 0) => {
  document.body.innerHTML = '<main id="main-content"></main>';
  build(document.querySelector('main')!, boxes, shift);
};

// a report column: a hero, then paragraphs of `each` px from `from`
const column = (from: number, each: number, count = 40): Box => ({
  top: from,
  height: each * count,
  kids: Array.from({ length: count }, (_, i) => ({ tag: 'p', top: from + i * each, height: each })),
});

beforeEach(() => {
  y = 0;
  scrollTo.mockClear();
  vi.stubGlobal('scrollTo', scrollTo);
  vi.stubGlobal('innerHeight', VIEW_HEIGHT);
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
  history.replaceState(null, '', '/reports/technical-report-142');
});

afterEach(() => {
  forgetScrollAnchors();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'scrollY');
  document.body.innerHTML = '';
});

describe('a history entry’s scroll anchor', () => {
  it('puts the block that topped the view back at its offset, whatever the blocks above now measure', () => {
    // read: paragraphs rendered at 150px each, the view at 6,040
    mount([{ tag: 'header', top: 0, height: 400 }, column(400, 150)]);
    y = 6040;
    rememberScrollAnchor('entry');
    // Back: the same page, its paragraphs held at a 112px estimate
    mount([{ tag: 'header', top: 0, height: 400 }, column(400, 112)]);
    y = 6040;
    restoreScrollAnchor('entry');
    // paragraph 37 sat at 400 + 37 * 150 - 6040 = -90; it now lays out at 400 + 37 * 112
    expect(scrollTo).toHaveBeenCalledWith({ top: 400 + 37 * 112 + 90, left: 0, behavior: 'instant' });
  });

  it('descends to a block that fits in part of the view, not the column around it', () => {
    mount([column(0, 150)]);
    y = 3000;
    rememberScrollAnchor('entry');
    mount([column(0, 150)]);
    y = 0;
    restoreScrollAnchor('entry');
    // the column is 6,000px: the anchor is its 20th paragraph, at 0 in the view
    expect(scrollTo).toHaveBeenCalledWith({ top: 3000, left: 0, behavior: 'instant' });
    expect(VIEW_HEIGHT * ANCHOR_VIEWPORT_SHARE).toBeLessThan(6000);
  });

  it('takes the layout position, so a reveal holding the block down does not count', () => {
    mount([column(0, 150)]);
    y = 3000;
    rememberScrollAnchor('entry');
    // the block at the top of the view is held 16px down by a transform
    mount([column(0, 150)], 16);
    y = 3000;
    restoreScrollAnchor('entry');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('passes over decorations laid out of flow', () => {
    mount([{ top: 0, height: 20000, style: 'position: absolute' }, column(0, 150)]);
    y = 3000;
    rememberScrollAnchor('entry');
    mount([{ top: 0, height: 20000, style: 'position: absolute' }, column(0, 100)]);
    restoreScrollAnchor('entry');
    expect(scrollTo).toHaveBeenCalledWith({ top: 2000, left: 0, behavior: 'instant' });
  });

  // R6, phone: the reader tapped a link in the open contents list; rendered
  // again after Back, the list was closed and 3,956px shorter
  it('passes over a disclosure, whose open state the page does not keep when it renders again', () => {
    const openContents: Box = { tag: 'details', top: 0, height: 4000, kids: [{ tag: 'summary', top: 0, height: 46 }, { tag: 'ul', top: 46, height: 3954 }] };
    mount([openContents, { top: 4000, height: 6000, kids: [{ tag: 'p', top: 4000, height: 150 }, { tag: 'p', top: 4150, height: 150 }] }]);
    y = 3500;
    rememberScrollAnchor('entry');
    mount([{ ...openContents, height: 46, kids: [{ tag: 'summary', top: 0, height: 46 }] }, { top: 46, height: 6000, kids: [{ tag: 'p', top: 46, height: 150 }, { tag: 'p', top: 196, height: 150 }] }]);
    y = 3500;
    restoreScrollAnchor('entry');
    // the first paragraph sat 500px down the view; it does again
    expect(scrollTo).toHaveBeenCalledWith({ top: 46 - 500, left: 0, behavior: 'instant' });
  });

  it('leaves a page that rendered differently where the browser put it', () => {
    mount([column(0, 150)]);
    y = 3000;
    rememberScrollAnchor('entry');
    mount([{ tag: 'section', top: 0, height: 6000, kids: [{ tag: 'h2', top: 0, height: 60 }] }]);
    restoreScrollAnchor('entry');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does nothing for an entry it never saw, or once the block is already in place', () => {
    mount([column(0, 150)]);
    y = 3000;
    restoreScrollAnchor('unknown');
    rememberScrollAnchor('entry');
    restoreScrollAnchor('entry');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  // the phone menu pushes the page down while open (Header.tsx)
  it('while held, keeps the place taken when the hold began', () => {
    mount([column(0, 150)]);
    y = 3000;
    const release = holdScrollAnchor();
    // the page moved under chrome the reader opened; leaving now changes nothing
    y = 3450;
    rememberScrollAnchor();
    y = 0;
    restoreScrollAnchor();
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 3000, left: 0, behavior: 'instant' });
    release();
    y = 3450;
    rememberScrollAnchor();
    y = 0;
    restoreScrollAnchor();
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 3450, left: 0, behavior: 'instant' });
  });

  it('keeps the latest entries only', () => {
    mount([column(0, 150)]);
    y = 3000;
    for (let i = 0; i <= ANCHOR_ENTRIES_KEPT; i++) rememberScrollAnchor(`entry-${i}`);
    y = 0;
    restoreScrollAnchor('entry-0');
    expect(scrollTo).not.toHaveBeenCalled();
    restoreScrollAnchor(`entry-${ANCHOR_ENTRIES_KEPT}`);
    expect(scrollTo).toHaveBeenCalledWith({ top: 3000, left: 0, behavior: 'instant' });
  });
});

// A report body as the browser lays it out: each paragraph `real` px once
// drawn, `estimate` px while skipped (content-visibility: auto), until it is
// rendered for real (an inline content-visibility: visible).
function prose(count: number, real: number, estimate: number, drawn: (i: number) => boolean) {
  document.body.innerHTML = '<main id="main-content"><div class="report-prose"></div></main>';
  const column = document.querySelector<HTMLElement>('.report-prose')!;
  const paragraphs = Array.from({ length: count }, (_, i) => {
    const p = document.createElement('p');
    column.append(p);
    return { p, drawn: drawn(i) };
  });
  const height = (i: number) => (paragraphs[i].drawn || paragraphs[i].p.style.contentVisibility === 'visible' ? real : estimate);
  const topOf = (i: number) => {
    let top = 0;
    for (let k = 0; k < i; k++) top += height(k);
    return top;
  };
  const box = (top: number, h: number) => () => ({ top: top - y, bottom: top - y + h, height: h, left: 0, right: 100, width: 100, x: 0, y: top - y, toJSON: () => ({}) });
  paragraphs.forEach(({ p }, i) => {
    Object.defineProperty(p, 'offsetTop', { configurable: true, get: () => topOf(i) });
    Object.defineProperty(p, 'offsetHeight', { configurable: true, get: () => height(i) });
    p.getBoundingClientRect = () => box(topOf(i), height(i))();
  });
  Object.defineProperty(column, 'offsetTop', { configurable: true, get: () => 0 });
  column.getBoundingClientRect = () => box(0, topOf(count))();
  return { topOf, rendered: (i: number) => paragraphs[i].p.style.contentVisibility === 'visible', paragraphs };
}

describe('the blocks around a restore point', () => {
  let frames: Array<Parameters<typeof requestAnimationFrame>[0]> = [];
  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (frame: (typeof frames)[number]) => frames.push(frame));
  });

  // Chromium, archive, 1440: corrected to the estimate-laid page, the anchor
  // then moved 108px as the cards around the view rendered in the next frame
  it('render for real above the block before it is measured, so the next frame moves nothing', () => {
    prose(120, 150, 112, () => true);
    y = 6000;
    rememberScrollAnchor('entry');
    // Back: every paragraph skipped, the browser's number restored
    const page = prose(120, 150, 112, () => false);
    y = 6000;
    restoreScrollAnchor('entry');
    // paragraph 40 topped the view at 0, in the layout as it will be drawn
    expect(y).toBe(page.topOf(40));
    // What lies above the view, as near as the browser draws, and in it, is
    // drawn: above, it would move the block; in the view, the block the
    // browser anchors its own scroll to (Chromium's archive: 23-36px off)
    for (let i = 0; i < 120; i++) {
      const top = page.topOf(i);
      if (top + 150 > y - VIEW_HEIGHT * ANCHOR_RENDER_MARGIN_VIEWS && top < y + VIEW_HEIGHT) {
        expect(page.rendered(i), `paragraph ${i}`).toBe(true);
      }
    }
    // the top of the report is not, nor what comes below the view
    expect(page.rendered(0)).toBe(false);
    expect(page.rendered(50)).toBe(false);
  });

  // Firefox, TR142: the anchor was a row inside a tall table whose scroll
  // box was still skipped at the restore; left out, it drew next frame and
  // the row came back 345px off
  it('render a skipped block that holds the anchor', () => {
    const body: Box = {
      className: 'report-prose',
      top: 3000,
      height: 1200,
      kids: [{ tag: 'pre', top: 3000, height: 1200, kids: Array.from({ length: 20 }, (_, i) => ({ top: 3000 + i * 60, height: 60 })) }],
    };
    mount([body]);
    y = 3300;
    rememberScrollAnchor('entry');
    mount([body]);
    const box = document.querySelector<HTMLElement>('.report-prose > pre')!;
    restoreScrollAnchor('entry');
    expect(box.style.contentVisibility).toBe('visible');
  });

  // Reading a box inside content still skipped makes the browser lay it out,
  // so a block whose container is skipped waits for a later pass; the block's
  // own answer is not what counts
  it('leave alone blocks whose container is still skipped, without reading them', () => {
    prose(120, 150, 112, () => true);
    y = 6000;
    rememberScrollAnchor('entry');
    const page = prose(120, 150, 112, () => false);
    const column = document.querySelector<HTMLElement>('.report-prose')!;
    // the paragraphs themselves are skipped: that alone keeps nothing out
    for (const { p } of page.paragraphs) Object.assign(p, { checkVisibility: () => false });
    Object.assign(column, { checkVisibility: () => true });
    y = 6000;
    restoreScrollAnchor('entry');
    expect(page.rendered(39)).toBe(true);

    prose(120, 150, 112, () => true);
    y = 6000;
    rememberScrollAnchor('entry');
    const skippedPage = prose(120, 150, 112, () => false);
    const read = vi.fn(skippedPage.paragraphs[38].p.getBoundingClientRect);
    skippedPage.paragraphs[38].p.getBoundingClientRect = read;
    Object.assign(document.querySelector('.report-prose')!, { checkVisibility: () => false });
    y = 6000;
    restoreScrollAnchor('entry');
    expect(read).not.toHaveBeenCalled();
    expect(skippedPage.rendered(38)).toBe(false);
  });

  it('hand the blocks back to skipping once they have been drawn, keeping their size', () => {
    prose(120, 150, 112, () => true);
    y = 6000;
    rememberScrollAnchor('entry');
    const page = prose(120, 150, 112, () => false);
    restoreScrollAnchor('entry');
    expect(page.rendered(39)).toBe(true);
    // the frame that draws them records their size (contain-intrinsic-size: auto)
    frames.splice(0).forEach((frame) => frame(0));
    expect(page.rendered(39)).toBe(true);
    frames.splice(0).forEach((frame) => frame(0));
    expect(page.paragraphs.some(({ p }) => p.style.contentVisibility !== '')).toBe(false);
  });
});

describe('the entry key', () => {
  it('is the Navigation API’s entry key where the browser has it, else the URL', () => {
    expect(currentEntryKey()).toBe(location.href);
    vi.stubGlobal('navigation', Object.assign(new EventTarget(), { currentEntry: { key: 'k-7' } }));
    expect(currentEntryKey()).toBe('k-7');
  });
});

describe('taking the anchor as the reader leaves', () => {
  let stop: () => void;
  // in the header, as the site's navigation is: the page under <main> keeps its shape
  const link = (href: string, attrs = '') => {
    document.body.insertAdjacentHTML('afterbegin', `<a href="${href}" ${attrs}>go</a>`);
    return document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)!;
  };
  // the page's own listener, as the router's Link has, keeps jsdom from navigating
  const click = (a: HTMLAnchorElement, init: ConstructorParameters<typeof MouseEvent>[1] = {}) => {
    a.addEventListener('click', (event) => event.preventDefault(), { once: true });
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
  };
  const restoresTo = (key: string) => {
    mount([column(0, 150)]);
    y = 0;
    restoreScrollAnchor(key);
    return scrollTo.mock.calls.at(-1)?.[0]?.top ?? null;
  };

  beforeEach(() => {
    stop = watchScrollAnchors();
  });
  afterEach(() => stop());

  it('at a click on a link to another page', () => {
    mount([column(0, 150)]);
    y = 3000;
    click(link('/papers'));
    expect(restoresTo(location.href)).toBe(3000);
  });

  // a #jump leaves its entry too; Back within the page returns to it
  it('at a jump within the page', () => {
    mount([column(0, 150)]);
    y = 3000;
    click(link('#references'));
    expect(restoresTo(location.href)).toBe(3000);
  });

  it('not at a modified click, a new tab or another site', () => {
    mount([column(0, 150)]);
    y = 3000;
    click(link('/papers'), { metaKey: true });
    click(link('/tools', 'target="_blank"'));
    click(link('https://example.com/'));
    expect(restoresTo(location.href)).toBeNull();
  });

  it('as Back or Forward leaves the page (Navigation API)', () => {
    const navigation = Object.assign(new EventTarget(), { currentEntry: { key: 'k-3' } });
    vi.stubGlobal('navigation', navigation);
    stop();
    stop = watchScrollAnchors();
    mount([column(0, 150)]);
    y = 4500;
    navigation.dispatchEvent(Object.assign(new Event('navigate'), { navigationType: 'push' }));
    expect(restoresTo('k-3')).toBeNull();
    y = 4500;
    navigation.dispatchEvent(Object.assign(new Event('navigate'), { navigationType: 'traverse' }));
    expect(restoresTo('k-3')).toBe(4500);
  });

  it('stops once cleaned up', () => {
    stop();
    mount([column(0, 150)]);
    y = 3000;
    click(link('/papers'));
    expect(restoresTo(location.href)).toBeNull();
  });
});

// R6, phone: after Back from /papers rendered TR142 again with its contents
// closed, Back to the section before used the number saved while the 4,003px
// contents list was open, 3,956px off. A traversal within the page puts the
// entry's block back too, a frame after the browser's own restore; one to
// another page waits for that page's commit (RouteArrival.tsx).
describe('Back or Forward within the page', () => {
  let frames: Array<Parameters<typeof requestAnimationFrame>[0]> = [];
  let stop: () => void;
  const navigation = Object.assign(new EventTarget(), { currentEntry: { key: 'k-refs' } });
  const traverse = (url: string, key: string) =>
    navigation.dispatchEvent(Object.assign(new Event('navigate'), { navigationType: 'traverse', destination: { url, key } }));

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (frame: (typeof frames)[number]) => frames.push(frame));
    vi.stubGlobal('navigation', navigation);
    stop = watchScrollAnchors();
  });
  afterEach(() => stop());

  const commit = () => window.dispatchEvent(new PopStateEvent('popstate', { state: { __NA: true } }));

  it('puts the destination entry’s block back, a frame after the browser’s restore', () => {
    mount([column(0, 150)]);
    y = 3000;
    rememberScrollAnchor('k-middle');
    // the page above has changed since (its contents list closed)
    mount([column(0, 100)]);
    y = 2600;
    traverse(`${location.origin}/reports/technical-report-142#methods`, 'k-middle');
    commit();
    expect(scrollTo).not.toHaveBeenCalled();
    frames.splice(0).forEach((frame) => frame(0));
    expect(scrollTo).toHaveBeenCalledWith({ top: 2000, left: 0, behavior: 'instant' });
  });

  // Firefox ran a frame between the navigate event and the traversal's
  // commit: restored then, the leaving entry saved the restored position,
  // and Forward came back 36,356px off
  it('waits for the traversal to commit', () => {
    mount([column(0, 150)]);
    y = 3000;
    rememberScrollAnchor('k-middle');
    mount([column(0, 100)]);
    y = 2600;
    traverse(`${location.origin}/reports/technical-report-142#methods`, 'k-middle');
    frames.splice(0).forEach((frame) => frame(0));
    expect(scrollTo).not.toHaveBeenCalled();
    commit();
    frames.splice(0).forEach((frame) => frame(0));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('leaves a traversal to another page to that page’s commit', () => {
    mount([column(0, 150)]);
    y = 3000;
    rememberScrollAnchor('k-papers');
    traverse(`${location.origin}/papers`, 'k-papers');
    frames.splice(0).forEach((frame) => frame(0));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
