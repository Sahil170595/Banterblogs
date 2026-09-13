import { classifyReportSlug, PHASE_DEFINITIONS, phaseNumber, type PhaseKey, type ReportCategory } from '@/lib/reports/phases';

// "TR164 V3: Cross-Backend ..." -> label "TR164 V3", heading "Cross-Backend ..."
const TR_TITLE_PREFIX = /^(TR\d+(?:\s[^:]+)?):\s*(.+)$/;
const PHASE_KEY = /^phase\d+$/;
// a phase's tab label without its number and TR range: "Phase 5 — Attack Surface (TR138–TR143)" -> "Attack Surface"
const PHASE_LABEL_NUMBER = /^Phase \d+\s*[—-]\s*/;
const PHASE_LABEL_RANGE = /\s*\([^)]*\)$/;
// what a document is, where it carries no TR number of its own
const DOCUMENT_LABEL: Partial<Record<ReportCategory, string>> = {
  phase0: 'Baseline',
  whitepaper: 'Whitepaper',
  conclusive: 'Conclusive report',
  appendix: 'Appendices',
  compendium: 'Compendium',
};

function phaseKeyOf(slug: string): PhaseKey | null {
  const category = classifyReportSlug(slug);
  if (PHASE_KEY.test(category)) return category as PhaseKey;
  return (/phase(\d+)/.exec(slug.toLowerCase())?.[0] as PhaseKey | undefined) ?? null;
}

/** The card heading and its meta line: the TR label moves out of the title. */
export function describeReport(slug: string, title: string): { heading: string; meta: string } {
  const prefix = TR_TITLE_PREFIX.exec(title);
  const heading = prefix ? prefix[2] : title;
  const category = classifyReportSlug(slug);
  if (category === 'compendium') return { heading, meta: 'Compendium' };
  const key = phaseKeyOf(slug);
  const phase = key ? `Phase ${phaseNumber(key)}` : null;
  const label = prefix ? prefix[1] : category === 'phase0' ? 'Baseline' : null;
  return { heading, meta: [label, phase].filter(Boolean).join(' · ') || 'Report' };
}

export interface ReportIdentity {
  /** the title without its TR label */
  heading: string;
  /** the TR label ("TR138", "TR164 V3"), or what the document is ("Whitepaper", "Baseline") */
  label: string | null;
  /** the research phase it belongs to, named without its TR range */
  phase: { key: PhaseKey; number: string; name: string } | null;
}

/** What the report page's head says a report is. */
export function reportIdentity(slug: string, title: string): ReportIdentity {
  const { heading } = describeReport(slug, title);
  const category = classifyReportSlug(slug);
  const label = TR_TITLE_PREFIX.exec(title)?.[1] ?? DOCUMENT_LABEL[category] ?? null;
  const key = phaseKeyOf(slug);
  const definition = key ? PHASE_DEFINITIONS.find((p) => p.key === key) : undefined;
  const phase = definition
    ? { key: definition.key, number: definition.number, name: definition.label.replace(PHASE_LABEL_NUMBER, '').replace(PHASE_LABEL_RANGE, '') }
    : null;
  return { heading, label, phase };
}
