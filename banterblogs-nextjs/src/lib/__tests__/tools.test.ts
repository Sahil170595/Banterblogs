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

  // R4: each tool page draws how the tool decides. The steps are the tool's
  // own: chimeraforge's README ("a 5-gate pipeline: VRAM -> quality -> safety
  // (opt-in) -> latency -> budget") and quantfit's verify-safety.
  it('draws chimeraforge plan through its five gates in the order the planner runs them', () => {
    const pipeline = toolBySlug('chimeraforge')!.pipeline!;
    const gates = pipeline.steps.filter((step) => (step.kind ?? 'step') === 'step').map((step) => step.label);
    expect(gates).toEqual(['VRAM', 'Quality', 'Safety', 'Latency', 'Budget']);
    expect(pipeline.steps[0].kind).toBe('io');
    expect(pipeline.steps.at(-1)!.kind).toBe('result');
    expect(pipeline.steps.find((step) => step.label === 'Safety')!.detail).toMatch(/opt-in/i);
  });

  it('draws quantfit verify-safety from the probe set to a bounded verdict', () => {
    const pipeline = toolBySlug('quantfit')!.pipeline!;
    expect(pipeline.steps.map((step) => step.label)).toEqual(['Probe set', 'Generate', 'Judge', 'Two axes', 'Verdict']);
    expect(pipeline.steps.at(-1)!.detail).toMatch(/never absolute/);
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

// Matches any semver-ish literal in the shapes these files actually use:
// "v0.12.3", "(v0.12.3)", "Version: 0.12.3". Deliberately NOT anchored to the
// CURRENT version — an earlier version of this guard searched for the current
// literal, which meant it went blind the moment tools.ts was bumped, i.e. on
// exactly the event it exists to catch.
const VERSION_LITERAL = /\bv?(\d+\.\d+\.\d+)\b/g;

function versionLiteralsNear(source: string, slug: string): string[] {
  const found: string[] = [];
  for (const line of source.split('\n')) {
    // only lines that are actually talking about this package
    if (!line.toLowerCase().includes(slug)) continue;
    for (const match of line.matchAll(VERSION_LITERAL)) found.push(match[1]);
  }
  return found;
}

describe('no hard-coded package versions outside the module', () => {
  it('keeps every TS/TSX surface reading versions from tools.ts', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (file.endsWith(path.join('lib', 'tools.ts'))) continue;
      const source = fs.readFileSync(file, 'utf8');
      for (const tool of TOOLS) {
        // ANY hard-coded version literal on a line naming the package is a
        // defect — whether or not it currently matches tools.ts.
        for (const literal of versionLiteralsNear(source, tool.slug)) {
          offenders.push(
            `${path.relative(SRC, file)} hard-codes ${tool.slug} v${literal} (must read from tools.ts)`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // llms.txt and the READMEs are hand-maintained (no imports can bind them to
  // the module), and they are exactly where the drift went unnoticed before.
  // Assert every version literal they state for a package EQUALS the module's.
  it('keeps the hand-maintained scraper surfaces current', () => {
    const manual = [
      path.join(process.cwd(), 'public', 'llms.txt'),
      path.join(process.cwd(), 'README.md'),
      path.join(process.cwd(), '..', 'README.md'),
    ];

    // A renamed/moved file must fail loudly rather than silently disarm the
    // guard, so assert existence instead of filtering missing paths away.
    const missing = manual.filter((file) => !fs.existsSync(file));
    expect(missing, 'guarded scraper surface is missing').toEqual([]);

    const stale: string[] = [];
    for (const file of manual) {
      const source = fs.readFileSync(file, 'utf8');
      for (const tool of TOOLS) {
        // Every version literal stated next to the package name must match —
        // catches the case where one of several mentions is updated and the
        // rest are forgotten.
        for (const literal of versionLiteralsNear(source, tool.slug)) {
          if (literal !== tool.version) {
            stale.push(
              `${path.basename(file)} states ${tool.slug} v${literal}, module says v${tool.version}`,
            );
          }
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
      // JSON.stringify DROPS undefined values rather than emitting the string
      // "undefined", so a substring check here can never fail. Assert the keys
      // actually survive serialization instead.
      const roundTripped = JSON.parse(JSON.stringify(jsonLd));
      for (const key of ['name', 'description', 'url', 'downloadUrl', 'softwareVersion', 'license']) {
        expect(roundTripped[key], `${tool.slug} JSON-LD lost ${key}`).toBeTruthy();
      }
    }
  });
});
