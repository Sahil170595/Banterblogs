import { ZodError, type core } from 'zod';

// A refused file or input in one plain sentence a visitor can act on: the
// field by name, items counted from one, and what it should be. Never a raw
// validation dump or a parser's message. An engine's own Error already reads
// as a sentence and passes through.

const NOT_JSON = 'The file is not valid JSON.';
const FALLBACK = 'The input was refused.';

// zod names a tuple and a record by their schemas; a file holds an array and an object
const EXPECTED_AS: Record<string, string> = { tuple: 'array', record: 'object' };

const article = (noun: string) => (/^[aeiou]/.test(noun) ? `an ${noun}` : `a ${noun}`);
const value = (expected: unknown) => (typeof expected === 'string' ? `"${expected}"` : String(expected));
const kindOf = (input: unknown) => (input === null ? 'null' : Array.isArray(input) ? 'array' : typeof input);
const fieldPath = (path: PropertyKey[]) => path.map((part) => (typeof part === 'number' ? `item ${part + 1}` : String(part))).join(' › ');

function sentence(issue: core.$ZodIssue): string {
  const where = fieldPath(issue.path);
  // an issue holds the value it was raised on only when its parse was given VISITOR_INPUT
  const kept = 'input' in issue;
  const missing = Boolean(where) && kept && issue.input === undefined;
  switch (issue.code) {
    case 'invalid_type': {
      const expected = EXPECTED_AS[issue.expected] ?? issue.expected;
      const received = kept ? kindOf(issue.input) : expected;
      const instead = received === expected ? '' : `, not ${article(received)}`;
      if (!where) return `The file should hold ${article(expected)}${instead}.`;
      if (missing || issue.expected === 'nonoptional') return `${where} is missing.`;
      if (issue.expected === 'int') return `${where} should be a whole number.`;
      return `${where} should be ${article(expected)}${instead}.`;
    }
    case 'invalid_value':
      if (missing) return `${where} is missing.`;
      if (issue.values.length === 1) return `${where || 'The file'} should be ${value(issue.values[0])}.`;
      return `${where || 'The file'} should be one of ${issue.values.map(String).join(', ')}.`;
    case 'unrecognized_keys': {
      const fields = issue.keys.length === 1 ? 'a field' : 'fields';
      return `${where ? `${where} has` : 'The file has'} ${fields} this page does not know: ${issue.keys.join(', ')}.`;
    }
    case 'too_small':
      if (issue.origin === 'string') return issue.minimum === 1 ? `${where} cannot be empty.` : `${where} should be at least ${issue.minimum} characters.`;
      if (issue.origin === 'array') return `${where} should hold at least ${issue.minimum}.`;
      return `${where} should be at least ${issue.minimum}.`;
    case 'too_big':
      if (issue.origin === 'string') return `${where} can be at most ${issue.maximum} characters.`;
      if (issue.origin === 'array') return `${where} can hold at most ${issue.maximum}.`;
      return `${where} should be at most ${issue.maximum}.`;
    default:
      return where ? `${where}: ${issue.message}` : issue.message;
  }
}

export function describeRefusal(error: unknown): string {
  if (error instanceof SyntaxError) return NOT_JSON;
  if (error instanceof ZodError) {
    const [first, ...rest] = error.issues;
    if (!first) return FALLBACK;
    const more = rest.length ? ` (${rest.length} more ${rest.length === 1 ? 'problem' : 'problems'}.)` : '';
    return `${sentence(first)}${more}`;
  }
  return error instanceof Error && error.message ? error.message : FALLBACK;
}
