import { ACCEPTED, PUBLIC_PREPRINTS, type Paper } from '@/lib/papers';

/** how many reports the archive's "Start here" strip names: one row of three at desktop */
export const START_HERE_LIMIT = 3;

export interface StartHereEntry {
  slug: string;
  /** the TR label /papers gives the report: "TR138" */
  label: string;
  /** the public paper the report is evidence for */
  paper: Paper;
}

// The lead evidence report of a paper is the first one /papers lists for it,
// the one whose picture the paper's card carries. Peer-reviewed papers come
// before preprints, as on /papers; a report two papers lead with is named once.
function leadEvidence(papers: Paper[]): StartHereEntry[] {
  const entries: StartHereEntry[] = [];
  for (const paper of papers) {
    const lead = paper.trs[0];
    if (!lead || entries.some((entry) => entry.slug === lead.slug)) continue;
    entries.push({ slug: lead.slug, label: lead.label, paper });
  }
  return entries.slice(0, START_HERE_LIMIT);
}

const ENTRIES = leadEvidence([...ACCEPTED, ...PUBLIC_PREPRINTS]);

/**
 * Where a newcomer to the archive starts, chosen by rule from /papers' own
 * data, never by taste. Rationale: these are the reports whose findings a
 * reader can check against a paper anyone can open.
 */
export const START_HERE = {
  /** the rule as the strip states it */
  rule: 'The lead evidence report behind each public paper.',
  entries: ENTRIES,
  slugs: ENTRIES.map((entry) => entry.slug),
} as const;
