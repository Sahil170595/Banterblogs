import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TOOLS, toolBySlug } from '../tools';
import { toolJsonLd } from '../toolJsonLd';

// The site once advertised chimeraforge 0.5.0 while PyPI shipped 0.12.3 —
// seven minor releases of drift, because every surface carried its own copy of
// the version string. These tests keep the literals out of the surfaces.

const SRC = path.join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('tools data module', () => {
  it('exposes both shipped CLIs, resolvable by slug', () => {
    expect(TOOLS.map((tool) => tool.slug)).toEqual(['chimeraforge', 'quantfit']);
    for (const tool of TOOLS) {
      expect(toolBySlug(tool.slug)).toBe(tool);
    }
    expect(toolBySlug('nope')).toBeUndefined();
  });

  it('keeps quantfit outside the nine-repo ecosystem count', () => {
    // quantfit is an independent tool; a page for it must not imply a 10th repo
    expect(toolBySlug('quantfit')?.ecosystem).toBe(false);
    expect(toolBySlug('chimeraforge')?.ecosystem).toBe(true);
  });

  it('carries a complete, well-formed entry for every tool', () => {
    for (const tool of TOOLS) {
      expect(tool.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(tool.install).toContain(tool.slug);
      expect(tool.pypi).toBe(`https://pypi.org/project/${tool.slug}/`);
      expect(tool.repo).toMatch(/^https:\/\/github\.com\//);
      expect(tool.commands.length).toBeGreaterThan(0);
      expect(tool.evidence.length).toBeGreaterThan(0);
      expect(tool.limits.length).toBeGreaterThan(0);
    }
  });

  it('cites only report slugs that exist in the catalog', () => {
    // a dead /reports/<slug> link is worse than no evidence link at all
    const meta = fs.readFileSync(path.join(SRC, 'lib', 'reports', 'meta.ts'), 'utf8');
    for (const tool of TOOLS) {
      for (const { reports } of tool.evidence) {
        for (const slug of reports) {
          expect(meta, `${tool.slug} cites missing report ${slug}`).toContain(`'${slug}':`);
        }
      }
    }
  });
});

describe('no hard-coded package versions outside the module', () => {
  it('keeps every TS/TSX surface reading versions from tools.ts', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (file.endsWith(path.join('lib', 'tools.ts'))) continue;
      const source = fs.readFileSync(file, 'utf8');
      for (const tool of TOOLS) {
        if (source.includes(`v${tool.version}`) || source.includes(`Version: ${tool.version}`)) {
          offenders.push(`${path.relative(SRC, file)} hard-codes ${tool.slug} ${tool.version}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // llms.txt and the READMEs are hand-maintained (no imports to bind them to
  // the module), and they are exactly where the drift went unnoticed before.
  // They cannot be auto-wired, so assert they at least state the CURRENT
  // version — this fails on the next release until they are refreshed.
  it('keeps the hand-maintained scraper surfaces current', () => {
    const manual = [
      path.join(process.cwd(), 'public', 'llms.txt'),
      path.join(process.cwd(), 'README.md'),
      path.join(process.cwd(), '..', 'README.md'),
    ].filter((file) => fs.existsSync(file));

    const stale: string[] = [];
    for (const file of manual) {
      const source = fs.readFileSync(file, 'utf8');
      for (const tool of TOOLS) {
        // Only police files that discuss the PACKAGE. A bare slug match would
        // false-positive on the domain (chimeraforge.vercel.app), so require an
        // install line or a PyPI project URL.
        const describesPackage =
          source.includes(tool.install) || source.includes(`pypi.org/project/${tool.slug}`);
        if (describesPackage && !source.includes(tool.version)) {
          stale.push(`${path.basename(file)} describes ${tool.slug} but not v${tool.version}`);
        }
      }
    }
    expect(stale).toEqual([]);
  });
});

describe('tool JSON-LD', () => {
  it('describes each tool as an installable SoftwareApplication', () => {
    for (const tool of TOOLS) {
      const jsonLd = toolJsonLd(tool);
      expect(jsonLd['@type']).toBe('SoftwareApplication');
      expect(jsonLd.name).toBe(tool.name);
      expect(jsonLd.softwareVersion).toBe(tool.version);
      expect(jsonLd.downloadUrl).toBe(tool.pypi);
      expect(jsonLd.url).toBe(`https://chimeraforge.vercel.app/tools/${tool.slug}`);
      expect(jsonLd.featureList).toHaveLength(tool.commands.length);
      expect(JSON.stringify(jsonLd)).not.toContain('undefined');
    }
  });
});
