import { ZodError, type ZodIssue } from 'zod';

// A refused file or input in one plain sentence a visitor can act on: the
// field by name, items counted from one, and what it should be. Never a raw
// validation dump or a parser's message. An engine's own Error already reads
// as a sentence and passes through.

const NOT_JSON = 'The file is not valid JSON.';
const FALLBACK = 'The input was refused.';

const article = (noun: string) => (/^[aeiou]/.test(noun) ? `an ${noun}` : `a ${noun}`);
const value = (expected: unknown) => (typeof expected === 'string' ? `"${expected}"` : String(expected));
const fieldPath = (path: (string | number)[]) => path.map((part) => (typeof part === 'number' ? `item ${part + 1}` : part)).join(' › ');

function sentence(issue: ZodIssue): string {
  const where = fieldPath(issue.path);
  switch (issue.code) {
    case 'invalid_type':
      if (!where) return `The file should hold ${article(issue.expected)}, not ${article(issue.received)}.`;
      if (issue.received === 'undefined') return `${where} is missing.`;
      if (issue.expected === 'integer') return `${where} should be a whole number.`;
      return `${where} should be ${article(issue.expected)}, not ${article(issue.received)}.`;
    case 'invalid_literal':
      if (where && issue.received === undefined) return `${where} is missing.`;
      return `${where || 'The file'} should be ${value(issue.expected)}.`;
    case 'invalid_enum_value':
      return `${where} should be one of ${issue.options.join(', ')}.`;
    case 'unrecognized_keys': {
      const fields = issue.keys.length === 1 ? 'a field' : 'fields';
      return `${where ? `${where} has` : 'The file has'} ${fields} this page does not know: ${issue.keys.join(', ')}.`;
    }
    case 'too_small':
      if (issue.type === 'string') return issue.minimum === 1 ? `${where} cannot be empty.` : `${where} should be at least ${issue.minimum} characters.`;
      if (issue.type === 'array') return `${where} should hold at least ${issue.minimum}.`;
      return `${where} should be at least ${issue.minimum}.`;
    case 'too_big':
      if (issue.type === 'string') return `${where} can be at most ${issue.maximum} characters.`;
      if (issue.type === 'array') return `${where} can hold at most ${issue.maximum}.`;
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
