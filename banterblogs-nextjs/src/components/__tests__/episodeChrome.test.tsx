import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(path.resolve(__dirname, file), 'utf8');

// Phase R3: the episode article reads in the R2 register, so its contents are
// the report page's (ReportTocSidebar beside the body from lg, the scroll-spy
// marker and the reading bar), and the old glass rail is gone.
describe('episode contents', () => {
  it('uses the report contents beside the body and above it on phones, with the reading bar', () => {
    const page = read('../../app/episodes/[slug]/page.tsx');
    expect(page).toMatch(/lg:grid-cols-\[minmax\(0,1fr\)_15rem\]/);
    expect(page).toMatch(/<ReportTocSidebar headings=\{headings\} \/>/);
    expect(page).toMatch(/<ReportTocMobile headings=\{headings\} \/>/);
    expect(page).toMatch(/<ReportProgress \/>/);
    expect(page).not.toMatch(/TableOfContents/);
  });
});

describe('fixed bottom UI on notched phones', () => {
  it('clears the safe-area insets', () => {
    for (const file of ['../MobileOptimization.tsx', '../EpisodeFloatingUI.tsx']) {
      const source = read(file);
      expect(source, file).toContain('bottom-[max(1.5rem,env(safe-area-inset-bottom))]');
      expect(source, file).not.toMatch(/\bbottom-6\b/);
    }
    expect(read('../EpisodeFloatingUI.tsx')).toContain('right-[max(1.5rem,env(safe-area-inset-right))]');
  });

  // re-judge P1-6: below md the like/bookmark/share stack and the prev/next
  // pill shared one bottom band, and the pill took the Bookmarks taps
  it('lifts the floating stack clear of the prev/next pill on phones', () => {
    const classes = /className="([^"]*)"/.exec(read('../EpisodeFloatingUI.tsx'))![1].split(/\s+/);
    expect(classes).toContain('bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+3.5rem)]');
    expect(classes).toContain('md:bottom-[max(1.5rem,env(safe-area-inset-bottom))]');
    // the pill is md:hidden, so from md the stack keeps the corner
    expect(read('../MobileOptimization.tsx')).toMatch(/\bmd:hidden\b/);
  });

  // Glass is for the header alone: the floating pill and popovers are opaque
  // raised surfaces (.floating-surface), drawn with a hairline, not a border.
  it('draws the floating pill and popovers as opaque raised surfaces, not glass', () => {
    for (const file of ['../MobileOptimization.tsx', '../SocialFeatures.tsx']) {
      const source = read(file);
      expect(source, file).toContain('floating-surface');
      expect(source, file).not.toMatch(/backdrop-blur|backdrop-filter|\bborder-border/);
    }
  });
});
