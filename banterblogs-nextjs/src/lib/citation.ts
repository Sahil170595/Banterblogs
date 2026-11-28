import { reportIdentity } from '@/components/reports/reportIdentity';
import { SITE_CONFIG } from '@/lib/constants';

// Citations for the reports and the public papers, as BibTeX and as plain
// text. Every field comes from data the site already publishes; a field the
// data does not hold is left out of the entry.

/** the origin every canonical URL on the site is built from (as /reports.json's BASE) */
export const SITE_ORIGIN = 'https://chimeraforge.vercel.app';

export interface Citation {
  /** the BibTeX citation key */
  key: string;
  bibtex: string;
  /** the same facts as one line of plain text */
  text: string;
}

// ── BibTeX text ──────────────────────────────────────────────────────────────

// the characters BibTeX or TeX read as syntax
const TEX_SPECIALS: Record<string, string> = {
  '\\': String.raw`\textbackslash{}`,
  '{': String.raw`\{`,
  '}': String.raw`\}`,
  '%': String.raw`\%`,
  '&': String.raw`\&`,
  _: String.raw`\_`,
  '#': String.raw`\#`,
  $: String.raw`\$`,
  '~': String.raw`\textasciitilde{}`,
  '^': String.raw`\textasciicircum{}`,
};

// typographic punctuation, symbols and Greek the reports and papers use
const TEX_SYMBOLS: Record<string, string> = {
  '—': '---',
  '–': '--',
  '‘': '`',
  '’': "'",
  '“': '``',
  '”': "''",
  '…': String.raw`\ldots{}`,
  ' ': '~',
  '×': String.raw`$\times$`,
  '±': String.raw`$\pm$`,
  '≥': String.raw`$\geq$`,
  '≤': String.raw`$\leq$`,
  '≈': String.raw`$\approx$`,
  '≠': String.raw`$\neq$`,
  '→': String.raw`$\rightarrow$`,
  '·': String.raw`$\cdot$`,
  '−': '$-$',
  '°': String.raw`$^\circ$`,
  '§': String.raw`\S{}`,
  ß: String.raw`{\ss}`,
  ø: String.raw`{\o}`,
  Ø: String.raw`{\O}`,
  æ: String.raw`{\ae}`,
  Æ: String.raw`{\AE}`,
  α: String.raw`$\alpha$`,
  β: String.raw`$\beta$`,
  γ: String.raw`$\gamma$`,
  δ: String.raw`$\delta$`,
  ε: String.raw`$\epsilon$`,
  η: String.raw`$\eta$`,
  θ: String.raw`$\theta$`,
  κ: String.raw`$\kappa$`,
  λ: String.raw`$\lambda$`,
  μ: String.raw`$\mu$`,
  µ: String.raw`$\mu$`,
  π: String.raw`$\pi$`,
  ρ: String.raw`$\rho$`,
  σ: String.raw`$\sigma$`,
  τ: String.raw`$\tau$`,
  φ: String.raw`$\phi$`,
  χ: String.raw`$\chi$`,
  ω: String.raw`$\omega$`,
  Δ: String.raw`$\Delta$`,
  Σ: String.raw`$\Sigma$`,
  Ω: String.raw`$\Omega$`,
};

// combining marks (Unicode NFD) to TeX accents: symbol accents take the
// letter bare ({\'e}), letter-named accents take it braced ({\c{c}})
const TEX_ACCENTS: Record<string, { command: string; braced: boolean }> = {
  '̀': { command: '`', braced: false },
  '́': { command: "'", braced: false },
  '̂': { command: '^', braced: false },
  '̃': { command: '~', braced: false },
  '̈': { command: '"', braced: false },
  '̄': { command: '=', braced: false },
  '̇': { command: '.', braced: false },
  '̆': { command: 'u', braced: true },
  '̌': { command: 'v', braced: true },
  '̋': { command: 'H', braced: true },
  '̧': { command: 'c', braced: true },
  '̨': { command: 'k', braced: true },
  '̊': { command: 'r', braced: true },
};

const ASCII_LETTER = /^[A-Za-z]$/;

// an accented Latin letter as its TeX accent; null when it is not one
function texAccent(char: string): string | null {
  const [base, mark, ...rest] = [...char.normalize('NFD')];
  const accent = mark ? TEX_ACCENTS[mark] : undefined;
  if (!accent || rest.length > 0 || !ASCII_LETTER.test(base)) return null;
  return accent.braced ? `{\\${accent.command}{${base}}}` : `{\\${accent.command}${base}}`;
}

/**
 * A value as BibTeX text: TeX's special characters escaped, and typographic
 * punctuation, symbols, Greek and accented Latin letters written as TeX. A
 * character with no TeX form here is kept as it is, never dropped.
 */
export function escapeBibtex(value: string): string {
  return [...value.normalize('NFC')].map((char) => TEX_SPECIALS[char] ?? TEX_SYMBOLS[char] ?? texAccent(char) ?? char).join('');
}

// how a field's value is written
type FieldKind = 'text' | 'title' | 'verbatim' | 'macro';

interface BibField {
  name: string;
  value: string;
  /** text: escaped. title: escaped, its capitals protected. verbatim: URLs and ids, as they are. macro: unbraced (a month). */
  kind?: FieldKind;
}

function fieldValue({ value, kind = 'text' }: BibField): string {
  if (kind === 'macro') return value;
  if (kind === 'verbatim') return `{${value}}`;
  if (kind === 'title') return `{{${escapeBibtex(value)}}}`;
  return `{${escapeBibtex(value)}}`;
}

function formatBibtex(type: string, key: string, fields: BibField[]): string {
  const width = Math.max(...fields.map((field) => field.name.length));
  const lines = fields.map((field) => `  ${field.name.padEnd(width)} = ${fieldValue(field)}`);
  return `@${type}{${key},\n${lines.join(',\n')}\n}`;
}

// ── shared facts ─────────────────────────────────────────────────────────────

// "Sahil Kadadekar" -> "Kadadekar, Sahil"
function bibtexAuthor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const family = parts.pop() ?? name;
  return parts.length ? `${family}, ${parts.join(' ')}` : family;
}

const AUTHOR = SITE_CONFIG.AUTHOR;
const AUTHOR_BIBTEX = bibtexAuthor(AUTHOR);
const KEY_AUTHOR = (AUTHOR.trim().split(/\s+/).pop() ?? AUTHOR).toLowerCase().replace(/[^a-z]/g, '');
const keyPart = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// ── reports ──────────────────────────────────────────────────────────────────

const BIBTEX_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// the year and BibTeX month of a real yyyy-mm-dd date; null for anything else
function yearAndMonth(date: string | null | undefined): { year: string; month: string } | null {
  const parts = date ? ISO_DATE.exec(date) : null;
  if (!date || !parts) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return { year: parts[1], month: BIBTEX_MONTHS[parsed.getUTCMonth()] };
}

const TR_LABEL = /^TR\d/;
const REPORT_SLUG_PREFIX = /^technical-report-/;
const STARTS_WITH_DIGIT = /^\d/;

export interface ReportCitationInput {
  /** the canonical slug, as in /reports/<slug> */
  slug: string;
  /** the catalog title, TR label included ("TR134: Alignment Robustness ...") */
  title: string;
  /** yyyy-mm-dd: the date the report states, or the day it was published */
  date?: string | null;
}

/** A report as a @techreport: author, title, institution, TR number, year and month, canonical URL. */
export function reportCitation({ slug, title, date }: ReportCitationInput): Citation {
  const { heading, label } = reportIdentity(slug, title);
  const number = label && TR_LABEL.test(label) ? label : null;
  const stated = yearAndMonth(date);
  const year = stated?.year ?? null;
  const url = `${SITE_ORIGIN}/reports/${slug}`;

  const rest = slug.replace(REPORT_SLUG_PREFIX, '');
  const subject = keyPart(STARTS_WITH_DIGIT.test(rest) ? `tr${rest}` : rest);
  const key = year ? `${KEY_AUTHOR}${year}${subject}` : `${KEY_AUTHOR}-${subject}`;

  const fields: BibField[] = [
    { name: 'author', value: AUTHOR_BIBTEX },
    { name: 'title', value: heading, kind: 'title' },
    { name: 'institution', value: SITE_CONFIG.NAME },
    ...(number ? [{ name: 'number', value: number }] : []),
    ...(stated ? [{ name: 'year', value: stated.year }, { name: 'month', value: stated.month, kind: 'macro' as const }] : []),
    { name: 'url', value: url, kind: 'verbatim' },
  ];
  const series = [number ? `Technical Report ${number}` : 'Technical report', SITE_CONFIG.NAME, ...(year ? [year] : [])].join(', ');
  return {
    key,
    bibtex: formatBibtex('techreport', key, fields),
    text: `${AUTHOR}. "${heading}." ${series}. ${url}`,
  };
}

// ── papers ───────────────────────────────────────────────────────────────────

/** A paper as /papers lists it. */
export interface PaperCitationInput {
  title: string;
  /** the venue line the page shows */
  venue: string;
  status: string;
  /** the preprint's arXiv abstract URL */
  arxiv?: string;
}

// Only a public paper is cited. Of its statuses, these name a venue the paper
// was taken by; a preprint's venue line names none.
const VENUE_STATUSES = new Set(['Presented', 'Accepted']);
const PUBLIC_STATUSES = new Set([...VENUE_STATUSES, 'Preprint']);
// a new-style arXiv id states its month: YYMM.number
const ARXIV_ABS = /^https?:\/\/arxiv\.org\/abs\/((\d{2})(\d{2})\.\d{4,5})(?:v\d+)?$/;
const ARXIV_CENTURY = 2000;
const TITLE_STOPWORDS = new Set(['a', 'an', 'the', 'on', 'of', 'for', 'is', 'in', 'to']);

/**
 * A public paper as a @misc with its arXiv id: null for a paper that is not
 * public (in preparation, in review, withheld) or has no arXiv id. The year
 * is the one the arXiv id states. A workshop paper keeps the page's venue
 * wording under its own status ("Presented at the ..."); nothing the page
 * does not state (a DOI, pages, proceedings) is written.
 */
export function paperCitation({ title, venue, status, arxiv }: PaperCitationInput): Citation | null {
  if (!PUBLIC_STATUSES.has(status)) return null;
  const id = arxiv ? ARXIV_ABS.exec(arxiv) : null;
  if (!arxiv || !id) return null;
  const [, eprint, yy] = id;
  const year = String(ARXIV_CENTURY + Number(yy));
  const note = VENUE_STATUSES.has(status) ? `${status} at the ${venue}` : null;
  const firstWord = title.split(/\s+/).map(keyPart).find((word) => word && !TITLE_STOPWORDS.has(word)) ?? 'paper';
  const key = `${KEY_AUTHOR}${year}${firstWord}`;

  const fields: BibField[] = [
    { name: 'author', value: AUTHOR_BIBTEX },
    { name: 'title', value: title, kind: 'title' },
    { name: 'year', value: year },
    { name: 'eprint', value: eprint, kind: 'verbatim' },
    { name: 'archivePrefix', value: 'arXiv' },
    { name: 'url', value: arxiv, kind: 'verbatim' },
    ...(note ? [{ name: 'note', value: note }] : []),
  ];
  return {
    key,
    bibtex: formatBibtex('misc', key, fields),
    text: [`${AUTHOR}. "${title}." arXiv:${eprint}, ${year}.`, ...(note ? [`${note}.`] : []), arxiv].join(' '),
  };
}
