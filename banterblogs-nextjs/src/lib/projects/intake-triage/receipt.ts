import { z } from 'zod';
import { scoreUrgency } from './score';
import { CLASSIFICATIONS, signalsSchema, URGENCIES, type Signals } from './signals';

// A scored bundle as a file: the signals and what the scorer decided. Import
// rescores the signals and refuses a file whose decision does not follow.

export const RECEIPT_VERSION = 'intake-triage.v1';
export const MAX_RECEIPT_BYTES = 20_000;

const decisionSchema = z
  .object({
    urgency: z.enum(URGENCIES),
    classification: z.enum(CLASSIFICATIONS),
    gate: z.enum(['P0_safeguarding', 'P1_noncaregiving_safety', 'operational']),
    score: z.number().int().nullable(),
  })
  .strict();

const receiptSchema = z.object({ version: z.literal(RECEIPT_VERSION), signals: signalsSchema, decision: decisionSchema }).strict();
export type Receipt = z.infer<typeof receiptSchema>;

export function makeReceipt(signals: Signals): Receipt {
  const { urgency, classification, gate, score } = scoreUrgency(signals);
  return { version: RECEIPT_VERSION, signals, decision: { urgency, classification, gate, score } };
}

/** the signals of a receipt whose decision the scorer reproduces */
export function replayReceipt(raw: unknown): Signals {
  const receipt = receiptSchema.parse(raw);
  const again = makeReceipt(receipt.signals).decision;
  const mismatch = (Object.keys(again) as (keyof typeof again)[]).filter((key) => again[key] !== receipt.decision[key]);
  if (mismatch.length) throw new Error(`The file's ${mismatch.join(', ')} does not follow from its signals.`);
  return receipt.signals;
}
