import { z } from 'zod';
import { runSearch } from './engine';
import { EXAMPLE_CORPUS } from './example';
import { querySchema, settingsSchema, type Query, type Settings } from './schema';

// A run as a file: the query, the settings and what came back. Import reruns
// the query over the example notes and refuses a file whose results do not
// follow.

export const RECEIPT_VERSION = 'staged-search.v1';
export const MAX_RECEIPT_BYTES = 50_000;

const resultSchema = z
  .object({
    status: z.enum(['ready', 'shortfall']),
    dropped: z.array(z.string()),
    selected: z.array(z.object({ id: z.string(), score: z.number() }).strict()),
    rejected: z.array(z.string()),
  })
  .strict();
const receiptSchema = z.object({ version: z.literal(RECEIPT_VERSION), query: querySchema, settings: settingsSchema, result: resultSchema }).strict();
export type Receipt = z.infer<typeof receiptSchema>;

export function makeReceipt(query: Query, settings: Settings): Receipt {
  const report = runSearch(EXAMPLE_CORPUS, query, settings);
  return {
    version: RECEIPT_VERSION,
    query,
    settings,
    result: {
      status: report.status,
      dropped: report.dropped.map((f) => f.field),
      selected: report.selected.map(({ id, score }) => ({ id, score })),
      rejected: report.rejected.map((c) => c.id),
    },
  };
}

/** the query and settings of a file whose results the pipeline reproduces */
export function replayReceipt(raw: unknown): { query: Query; settings: Settings } {
  const receipt = receiptSchema.parse(raw);
  const again = makeReceipt(receipt.query, receipt.settings).result;
  if (JSON.stringify(again) !== JSON.stringify(receipt.result)) throw new Error('The file’s results do not follow from its query and settings.');
  return { query: receipt.query, settings: receipt.settings };
}
