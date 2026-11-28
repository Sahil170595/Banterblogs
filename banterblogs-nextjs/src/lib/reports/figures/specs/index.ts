import type { FigureSpec } from '../types';
import { PHASE0_FIGURES } from './phase0';
import { PHASE1_FIGURES } from './phase1';
import { PHASE2_FIGURES } from './phase2';
import { PHASE3_FIGURES } from './phase3';
import { PHASE4_FIGURES } from './phase4';
import { PHASE5_FIGURES } from './phase5';
import { PHASE6_FIGURES } from './phase6';
import { PHASE7_FIGURES } from './phase7';
import { PHASE8_FIGURES } from './phase8';
import { PHASE9_FIGURES } from './phase9';

/** One figure per report: the table that holds its headline result. */
export const FIGURE_SPECS: FigureSpec[] = [
  ...PHASE0_FIGURES,
  ...PHASE1_FIGURES,
  ...PHASE2_FIGURES,
  ...PHASE3_FIGURES,
  ...PHASE4_FIGURES,
  ...PHASE5_FIGURES,
  ...PHASE6_FIGURES,
  ...PHASE7_FIGURES,
  ...PHASE8_FIGURES,
  ...PHASE9_FIGURES,
];

/**
 * Technical reports that keep the seeded visual, and why. A report leaves this
 * list by gaining a spec; the spec test holds the two in step.
 */
export const REPORTS_WITHOUT_FIGURE: Record<string, string> = {
  'technical-report-109': 'its lead finding is qualitative; the one charted number is a single-run spike the report says did not replicate',
  'technical-report-111': 'its headline range spans a 19-row table; no smaller table the report itself draws holds it',
  'technical-report-121': 'a superseded pipeline draft with no measured result',
  'technical-report-122': 'its headline baseline sits only in tables that mix watts, degrees and percent',
  'technical-report-146': 'its lead is a null no table row carries; the next finding quotes values the table does not hold',
  'technical-report-149': 'its pooled estimate is only in the metadata table; the per-cell deltas alone would overstate a null',
  'technical-report-164-v4': 'its headline correlation sits only in a named-value reference table, beside unlike statistics',
};
