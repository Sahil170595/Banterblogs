import { z } from 'zod';
import { isoMicros, replaySchema, runReplay, type Replay } from './scheduler';

// A replay as a file: its parameters and the send times it produced. Import
// reruns the scheduler and refuses a file whose times do not follow.

export const RECEIPT_VERSION = 'send-pacing.v1';
export const MAX_RECEIPT_BYTES = 50_000;

const receiptSchema = z
  .object({
    version: z.literal(RECEIPT_VERSION),
    replay: replaySchema,
    sendTimes: z.array(z.string()).max(48),
    violations: z.array(z.tuple([z.number().int(), z.string()])),
  })
  .strict();
export type Receipt = z.infer<typeof receiptSchema>;

export function makeReceipt(replay: Replay): Receipt {
  const result = runReplay(replay);
  return {
    version: RECEIPT_VERSION,
    replay,
    sendTimes: result.schedule.map((row) => isoMicros(row.sendTime)),
    violations: result.violations.map((v) => [v.index, v.code]),
  };
}

export function replayReceipt(raw: unknown): Replay {
  const receipt = receiptSchema.parse(raw);
  if (JSON.stringify(makeReceipt(receipt.replay)) !== JSON.stringify(receipt)) throw new Error('The file’s send times do not follow from its parameters.');
  return receipt.replay;
}
