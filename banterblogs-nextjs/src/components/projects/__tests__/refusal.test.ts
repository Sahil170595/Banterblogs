import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { describeRefusal } from '../refusal';

// live QA: refused files and inputs showed raw validation dumps ("[ { "code":
// "invalid_enum_value" … } ]") and JavaScript parse errors; a visitor gets one
// plain sentence naming the field and what was wrong with it

const SCHEMA = z
  .object({
    schemaVersion: z.literal(1),
    query: z.object({ filters: z.array(z.object({ op: z.enum(['Eq', 'Gte']), value: z.number().int() })) }),
    label: z.string().min(1),
    items: z.array(z.number()).max(2),
  })
  .strict();

const refuse = (input: unknown) => {
  const result = SCHEMA.safeParse(input);
  if (result.success) throw new Error('expected a refusal');
  return describeRefusal(result.error);
};
const VALID = { schemaVersion: 1, query: { filters: [{ op: 'Eq', value: 1 }] }, label: 'x', items: [1] };

describe('describeRefusal', () => {
  it('says a file is not JSON, without the parser’s message', () => {
    let error: unknown;
    try {
      JSON.parse('this is not');
    } catch (cause) {
      error = cause;
    }
    expect(describeRefusal(error)).toBe('The file is not valid JSON.');
  });

  it('names the field in words, counting items from one, and says what it should be', () => {
    expect(refuse({ ...VALID, query: { filters: [{ op: 'Like', value: 1 }] } })).toBe('query › filters › item 1 › op should be one of Eq, Gte.');
    expect(refuse({ ...VALID, query: { filters: [{ op: 'Eq', value: 2025.5 }] } })).toBe('query › filters › item 1 › value should be a whole number.');
    expect(refuse({ ...VALID, schemaVersion: 2 })).toBe('schemaVersion should be 1.');
    expect(refuse({ ...VALID, label: '' })).toBe('label cannot be empty.');
    expect(refuse({ ...VALID, items: [1, 2, 3] })).toBe('items can hold at most 2.');
    expect(refuse({ ...VALID, extra: true })).toBe('The file has a field this page does not know: extra.');
  });

  it('says what is missing, and counts any further problems', () => {
    expect(refuse({})).toMatch(/^schemaVersion is missing\. \(\d+ more problems\.\)$/);
    expect(refuse([1, 2, 3])).toBe('The file should hold an object, not an array.');
  });

  it('passes an engine’s own sentence through', () => {
    expect(describeRefusal(new Error('The file’s urgency does not follow from its signals.'))).toBe('The file’s urgency does not follow from its signals.');
  });
});
