import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RECENT_RELEASES, ReleaseHistory, ToolPage } from '@/components/ToolPage';
import { TOOL_RELEASES, compareVersions, formatReleaseDate, formatReleaseMonth, groupByMonth, releaseHistory, type ToolReleaseHistory } from '@/lib/toolReleases';
import { TOOLS } from '@/lib/tools';

// Each tool page closes on its release history, read from the committed PyPI
// snapshot (lib/toolReleases.json): the newest releases as hairline rows, the
// rest folded by month so a hundred releases stay a short list, every one of
// them in the server HTML.

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

describe.each(TOOLS.map((tool) => [tool.slug, tool] as const))('/tools/%s release history', (_slug, tool) => {
  const history = releaseHistory(tool.slug)!;
  const section = () => render(<ToolPage tool={tool} />).container.querySelector('#releases')!;

  it('follows the stated limits as its own section, before the links onward', () => {
    const el = render(<ToolPage tool={tool} />).container;
    const releases = el.querySelector('#releases')!;
    expect(text(releases.querySelector('h2')!)).toBe('Release history');
    expect(el.querySelector('#limits')!.compareDocumentPosition(releases) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(releases.compareDocumentPosition(el.querySelector('a[href="/tools"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('says how many releases, since when, where they were read and on what date', () => {
    const el = section();
    const oldest = history.releases.at(-1)!;
    expect(text(el)).toContain(`${history.releases.length} releases on PyPI since ${formatReleaseDate(oldest.uploadedAt)}`);
    expect(text(el)).toContain(`PyPI snapshot of ${formatReleaseDate(TOOL_RELEASES.fetchedAt)}`);
    expect(el.querySelector(`time[datetime="${TOOL_RELEASES.fetchedAt}"]`)).not.toBeNull();
    expect(el.querySelector(`a[href="${tool.pypi}#history"]`)).not.toBeNull();
    expect(el.querySelector(`a[href="${history.notesSource}"]`)).not.toBeNull();
  });

  it('shows the newest releases as rows: version, UTC date and the line from its notes', () => {
    const rows = [...section().querySelectorAll('[data-releases="recent"] > li')];
    const recent = history.releases.slice(0, RECENT_RELEASES);
    expect(rows).toHaveLength(recent.length);
    recent.forEach((release, i) => {
      expect(text(rows[i])).toContain(`v${release.version}`);
      const time = rows[i].querySelector('time')!;
      expect(time.getAttribute('datetime')).toBe(release.uploadedAt);
      expect(text(time)).toBe(formatReleaseDate(release.uploadedAt));
      if (release.summary) expect(text(rows[i])).toContain(release.summary);
    });
  });

  it('folds the earlier releases by month, each closed, with its count and its span of versions', () => {
    const groups = [...section().querySelectorAll<HTMLDetailsElement>('[data-releases="earlier"] details')];
    const months = groupByMonth(history.releases.slice(RECENT_RELEASES));
    // the month the recent rows end in carries on into the first fold
    const continued = groupByMonth(history.releases.slice(0, RECENT_RELEASES)).at(-1)!.month;
    expect(groups).toHaveLength(months.length);
    months.forEach((month, i) => {
      expect(groups[i].open).toBe(false);
      const summary = text(groups[i].querySelector('summary')!);
      const noun = month.releases.length === 1 ? 'release' : 'releases';
      expect(summary).toContain(formatReleaseMonth(month.month));
      expect(summary).toContain(`${month.releases.length} ${month.month === continued ? 'more ' : ''}${noun}`);
      expect(summary).toContain(month.releases.length === 1 ? `v${month.newest.version}` : `v${month.oldest.version} – v${month.newest.version}`);
      expect([...groups[i].querySelectorAll('li')].map((li) => li.querySelector('time')!.getAttribute('datetime'))).toEqual(month.releases.map((release) => release.uploadedAt));
    });
  });

  it('carries every release in the server HTML, newest first, with no script needed to read it', () => {
    const markup = renderToStaticMarkup(<ToolPage tool={tool} />);
    const html = markup.slice(markup.indexOf('id="releases"'));
    const stamps = [...html.matchAll(/<time[^>]*\sdatetime="([^"]+)"/gi)].map((match) => match[1]);
    const index = history.releases.findIndex((release) => release.version === tool.version);
    const pinned = index >= RECENT_RELEASES ? [history.releases[index].uploadedAt] : [];
    // the snapshot's own date leads, then the pinned release when there is one, then one stamp per release
    expect(stamps).toEqual([TOOL_RELEASES.fetchedAt, ...pinned, ...history.releases.map((release) => release.uploadedAt)]);
    for (const release of history.releases) expect(html, release.version).toContain(`v${release.version}<`);
  });

  // tools.ts may trail PyPI: the facts on the page were checked against one
  // release, and the history says which, so the newer ones read as newer
  it('marks the one release the page describes in the list, and says how many are newer', () => {
    const el = section();
    const marked = [...el.querySelectorAll('[data-releases="recent"] li, [data-releases="earlier"] li')].filter((li) => li.querySelector(':scope > div [data-release-described]'));
    expect(marked).toHaveLength(1);
    expect(text(marked[0])).toContain(`v${tool.version}`);
    expect(text(marked[0].querySelector('[data-release-described]')!)).toBe('This page describes');
    const newer = history.releases.filter((release) => compareVersions(release.version, tool.version) > 0).length;
    const note = text(el.querySelector('[data-releases="described"]')!);
    expect(note).toContain(`v${tool.version}`);
    if (newer > 0) expect(note).toContain(`${newer} newer ${newer === 1 ? 'release is' : 'releases are'} listed`);
    else expect(note).toContain('the latest release');
  });

  // a closed month would hide the release the page describes, so it is
  // pinned under the note as well; among the recent rows it needs no pin
  it('shows the release the page describes without opening a fold', () => {
    const el = section();
    const index = history.releases.findIndex((release) => release.version === tool.version);
    const pinned = el.querySelector('[data-releases="pinned"]');
    if (index < RECENT_RELEASES) {
      expect(pinned).toBeNull();
      return;
    }
    const release = history.releases[index];
    expect(el.querySelector('[data-releases="described"]')!.nextElementSibling).toBe(pinned);
    expect(pinned!.closest('details')).toBeNull();
    expect(pinned!.querySelector('time')!.getAttribute('datetime')).toBe(release.uploadedAt);
    expect(text(pinned!.querySelector('[data-release-described]')!)).toBe('This page describes');
    expect(text(pinned!)).toContain(`v${release.version}`);
    if (release.summary) expect(text(pinned!)).toContain(release.summary);
  });

  it('gives no element of the page an id twice', () => {
    const ids = [...render(<ToolPage tool={tool} />).container.querySelectorAll('[id]')].map((node) => node.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('keeps the page’s outline short: no heading per release', () => {
    expect(section().querySelectorAll('h3, h4')).toHaveLength(0);
  });
});

describe('a release list’s edges', () => {
  const HISTORY: ToolReleaseHistory = {
    slug: 'demo',
    package: 'demo',
    source: 'https://pypi.org/pypi/demo/json',
    notesSource: 'https://github.com/example/demo/releases',
    releases: [
      { version: '0.3.0', uploadedAt: '2026-11-01T03:30:00Z', yanked: true, summary: 'Withdrawn build' },
      { version: '0.2.0', uploadedAt: '2026-10-31T23:00:00Z', yanked: false },
    ],
  };
  const el = (described = '0.3.0') =>
    render(<ReleaseHistory history={HISTORY} pypi="https://pypi.org/project/demo/" fetchedAt="2026-11-02T00:00:00Z" described={described} />).container;

  it('says the page describes the latest release when nothing is newer, and counts one newer release in the singular', () => {
    expect(text(el('0.3.0').querySelector('[data-releases="described"]')!)).toBe('This page describes v0.3.0, the latest release.');
    expect(text(el('0.2.0').querySelector('[data-releases="described"]')!)).toBe('This page describes v0.2.0; 1 newer release is listed above it.');
    expect([...el('0.2.0').querySelectorAll('[data-release-described]')].map((mark) => text(mark.closest('li')!).includes('v0.2.0'))).toEqual([true]);
  });

  it('marks a yanked release, and shows a release without notes as its version and date alone', () => {
    const rows = [...el().querySelectorAll('[data-releases="recent"] > li')];
    expect(text(rows[0])).toContain('Yanked');
    expect(text(rows[1])).not.toContain('Yanked');
    expect(text(rows[0])).toContain('Withdrawn build');
    expect(text(rows[1]).replace('Oct 31, 2026', '').trim()).toBe('v0.2.0');
    expect(text(rows[0])).toContain('This page describes');
  });

  it('draws no empty fold when every release fits the recent rows', () => {
    expect(el().querySelector('[data-releases="earlier"]')).toBeNull();
    expect(text(el())).toContain('2 releases on PyPI since Oct 31, 2026');
  });

  it('pins nothing when the release the page describes is already a visible row', () => {
    expect(el('0.3.0').querySelector('[data-releases="pinned"]')).toBeNull();
    expect(el('0.2.0').querySelector('[data-releases="pinned"]')).toBeNull();
  });
});

describe('the release the page describes, behind a closed month', () => {
  // two more releases than the recent rows hold: the oldest two fold into October
  const COUNT = RECENT_RELEASES + 2;
  const releases = Array.from({ length: COUNT }, (_, i) => ({
    version: `0.${COUNT - i}.0`,
    uploadedAt: i < RECENT_RELEASES ? `2026-11-${String(20 - i).padStart(2, '0')}T12:00:00Z` : `2026-10-${String(20 - i).padStart(2, '0')}T12:00:00Z`,
    yanked: false,
    summary: `Notes for 0.${COUNT - i}.0`,
  }));
  const HISTORY: ToolReleaseHistory = {
    slug: 'demo',
    package: 'demo',
    source: 'https://pypi.org/pypi/demo/json',
    notesSource: 'https://github.com/example/demo/releases',
    releases,
  };
  const oldest = releases.at(-1)!;
  const el = () =>
    render(<ReleaseHistory history={HISTORY} pypi="https://pypi.org/project/demo/" fetchedAt="2026-11-21T00:00:00Z" described={oldest.version} />).container;

  it('pins it as one visible row directly under the note', () => {
    const page = el();
    const note = page.querySelector('[data-releases="described"]')!;
    const pinned = page.querySelector('[data-releases="pinned"]')!;
    expect(text(note)).toBe(`This page describes v${oldest.version}; ${COUNT - 1} newer releases are listed above it.`);
    expect(note.nextElementSibling).toBe(pinned);
    expect(page.querySelectorAll('[data-releases="pinned"]')).toHaveLength(1);
    expect(pinned.closest('details')).toBeNull();
    expect(pinned.querySelector('time')!.getAttribute('datetime')).toBe(oldest.uploadedAt);
    expect(text(pinned)).toContain(`v${oldest.version}`);
    expect(text(pinned)).toContain('This page describes');
    expect(text(pinned)).toContain(`Notes for ${oldest.version}`);
  });

  it('keeps it marked in its own closed month as well, so the list stays whole', () => {
    const folds = [...el().querySelectorAll<HTMLDetailsElement>('[data-releases="earlier"] details')];
    expect(folds).toHaveLength(1);
    expect(folds[0].open).toBe(false);
    const rows = [...folds[0].querySelectorAll('li')];
    expect(rows.map((row) => row.querySelector('time')!.getAttribute('datetime'))).toEqual(releases.slice(RECENT_RELEASES).map((release) => release.uploadedAt));
    expect(rows.filter((row) => row.querySelector('[data-release-described]')).map((row) => text(row).includes(`v${oldest.version}`))).toEqual([true]);
  });
});
