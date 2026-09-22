// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The owner's standing rule: no phone number or email address anywhere on the
// site. It scans the source and every text file served from public/ (llms.txt
// is a page of the site too), so a contact link cannot come back unnoticed.

const ROOT = process.cwd();
const SCANNED_DIRS = [path.join(ROOT, 'src'), path.join(ROOT, 'public')];
const TEXT_FILE = /\.(tsx?|css|mdx?|txt|xml|json|html)$/;
const CONTACT_LINK = /\b(?:mailto|tel):/i;
// a local part, an @, and a dotted domain; "substack.com/@handle" has no local part
const EMAIL_ADDRESS = /(?<![\w/])[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

function textFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : textFiles(full);
    return TEXT_FILE.test(entry.name) ? [full] : [];
  });
}

function offenders(files: string[]): string[] {
  return files.flatMap((file) =>
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        CONTACT_LINK.test(line) || EMAIL_ADDRESS.test(line) ? [`${path.relative(ROOT, file)}:${index + 1}: ${line.trim().slice(0, 120)}`] : [],
      ),
  );
}

describe('no contact details on the site', () => {
  it('detects mailto and tel links and email addresses, and not handles or words that end in "tel"', () => {
    for (const line of ['href="mailto:someone@example.com"', "href='tel:+15550100'", 'Email: someone@example.org']) {
      expect(CONTACT_LINK.test(line) || EMAIL_ADDRESS.test(line), line).toBe(true);
    }
    for (const line of ['https://substack.com/@sahilkadadekar', 'Intel: Arc GPUs', 'x.com/@handle/status/1', '@tailwind base;']) {
      expect(CONTACT_LINK.test(line) || EMAIL_ADDRESS.test(line), line).toBe(false);
    }
  });

  it('scans the source and the public files', () => {
    const files = SCANNED_DIRS.flatMap(textFiles);
    for (const known of ['src/components/Footer.tsx', 'public/llms.txt']) expect(files).toContain(path.join(ROOT, known));
  });

  it('publishes no mailto or tel link and no email address', () => {
    expect(offenders(SCANNED_DIRS.flatMap(textFiles))).toEqual([]);
  });
});
