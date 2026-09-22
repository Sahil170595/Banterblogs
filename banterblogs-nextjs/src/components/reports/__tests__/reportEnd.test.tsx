import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { REPORT_END_ATTRIBUTE as SPY_END_ATTRIBUTE } from '../ReportTocSpy';
import { REPORT_END_ATTRIBUTE, ReportEnd } from '../reportEnd';

// The end-of-body marker the contents' scroll-spy looks for. A server page
// that took the attribute name from ReportTocSpy, a 'use client' module, got
// a client reference instead of the string: the marker rendered as a bare
// <div></div> on every report (checked on production, 2026-09-21), so the
// spy never knew the body had ended. The marker lives in a plain module.

const SRC = path.join(process.cwd(), 'src');
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf8');

describe('report end marker', () => {
  it('renders the attribute the spy looks for', () => {
    expect(renderToStaticMarkup(<ReportEnd />)).toBe(`<div ${REPORT_END_ATTRIBUTE}=""></div>`);
    expect(SPY_END_ATTRIBUTE).toBe(REPORT_END_ATTRIBUTE);
  });

  it('comes from a module server pages can read values from', () => {
    expect(read('components/reports/reportEnd.tsx')).not.toMatch(/^['"]use client['"]/m);
    for (const page of ['app/reports/[id]/page.tsx', 'app/episodes/[slug]/page.tsx']) {
      const source = read(page);
      expect(source, page).toMatch(/<ReportEnd \/>/);
      expect(source, page).not.toMatch(/import \{[^}]*REPORT_END_ATTRIBUTE[^}]*\} from '@\/components\/reports\/ReportTocSpy'/);
    }
  });
});
