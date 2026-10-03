import { MAX_RANGE_CELLS } from './types';

type Expr =
  | { kind: 'number'; value: number }
  | { kind: 'ref'; id: string }
  | { kind: 'binary'; op: string; left: Expr; right: Expr }
  | { kind: 'unary'; sign: number; expr: Expr }
  | { kind: 'sum'; args: Expr[] };

const SUPPORTED = 'Supported formulas: numbers, A1 or Sheet!A1 references, + - * /, parentheses, and SUM with bounded ranges.';
// how much of an unreadable stretch an error quotes
const UNREAD_PREVIEW = 12;
const columnNumber = (letters: string) => [...letters].reduce((n, char) => n * 26 + char.charCodeAt(0) - 64, 0);
const columnName = (n: number): string => n <= 26 ? String.fromCharCode(64 + n) : columnName(Math.floor((n - 1) / 26)) + String.fromCharCode(65 + (n - 1) % 26);

export function parseFormula(input: string, sheet: string): { expression: Expr; refs: string[]; aggregation: boolean; passThrough: boolean } {
  const source = input.trim().replace(/^=/, '');
  let position = 0;
  const refs = new Set<string>();
  let aggregation = false;
  function spaces() { while (/\s/.test(source[position] ?? '') && position < source.length) position++; }
  function consume(char: string) { spaces(); if (source[position] === char) { position++; return true; } return false; }
  function reference(): string | null {
    spaces();
    const match = source.slice(position).match(/^(?:([A-Za-z][A-Za-z0-9_]{0,19})!)?(\$?[A-Za-z]{1,2}\$?[1-9][0-9]{0,6})(?![A-Za-z0-9_])/);
    if (!match) return null;
    position += match[0].length;
    const id = `${match[1] ?? sheet}!${match[2].replace(/\$/g, '').toUpperCase()}`;
    return id;
  }
  function range(start: string): Expr[] {
    const end = reference();
    if (!end) throw new Error('A range must end with a cell reference.');
    const [startSheet, startAddress] = start.split('!');
    const [endSheet, endAddress] = end.split('!');
    // Unqualified range endpoints inherit the starting sheet, including cross-sheet SUM.
    const explicitlyQualified = source.slice(0, position).match(/:([^,:()]*)$/)?.[1].includes('!');
    if (explicitlyQualified && endSheet !== startSheet) throw new Error('A range cannot span sheets.');
    const a = startAddress.match(/^([A-Z]+)(\d+)$/)!;
    const b = endAddress.match(/^([A-Z]+)(\d+)$/)!;
    const c1 = columnNumber(a[1]), c2 = columnNumber(b[1]), r1 = Number(a[2]), r2 = Number(b[2]);
    if (c2 < c1 || r2 < r1) throw new Error('Reversed range: use top-left to bottom-right.');
    if ((c2 - c1 + 1) * (r2 - r1 + 1) > MAX_RANGE_CELLS) throw new Error(`Range limit is ${MAX_RANGE_CELLS} cells.`);
    const expanded: Expr[] = [];
    for (let row = r1; row <= r2; row++) for (let col = c1; col <= c2; col++) {
      const id = `${startSheet}!${columnName(col)}${row}`;
      expanded.push({ kind: 'ref', id });
    }
    aggregation = true;
    return expanded;
  }
  function atom(): Expr {
    spaces();
    if (consume('+')) return { kind: 'unary', sign: 1, expr: atom() };
    if (consume('-')) return { kind: 'unary', sign: -1, expr: atom() };
    if (consume('(')) {
      const expr = expression();
      if (!consume(')')) throw new Error('Missing closing parenthesis.');
      return expr;
    }
    const sum = source.slice(position).match(/^SUM\s*\(/i);
    if (sum) {
      position += sum[0].length;
      const args: Expr[] = [];
      do {
        const saved = position;
        const ref = reference();
        if (ref && consume(':')) args.push(...range(ref));
        else { position = saved; args.push(expression()); }
      } while (consume(','));
      if (!consume(')')) throw new Error('SUM requires a closing parenthesis.');
      return { kind: 'sum', args };
    }
    const ref = reference();
    if (ref) return { kind: 'ref', id: ref };
    const number = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) { position += number[0].length; return { kind: 'number', value: Number(number[0]) }; }
    throw new Error(unreadable());
  }
  // what stopped the parser, in words a person can act on
  function unreadable(): string {
    const rest = source.slice(position);
    if (!rest.trim()) return `The formula ends after an operator: add a number or a cell reference after it. ${SUPPORTED}`;
    const call = rest.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (call) return `${call[1].toUpperCase()} is not a supported function: only SUM is. ${SUPPORTED}`;
    return `Cannot read "${rest.slice(0, UNREAD_PREVIEW)}" at character ${position + 1}. ${SUPPORTED}`;
  }
  function product(): Expr {
    let left = atom();
    while (true) {
      spaces();
      const op = source[position];
      if (op !== '*' && op !== '/') break;
      position++;
      left = { kind: 'binary', op, left, right: atom() };
    }
    return left;
  }
  function expression(): Expr {
    let left = product();
    while (true) {
      spaces();
      const op = source[position];
      if (op !== '+' && op !== '-') break;
      position++;
      left = { kind: 'binary', op, left, right: product() };
    }
    return left;
  }
  const parsed = expression();
  spaces();
  if (position !== source.length) {
    const rest = source.slice(position);
    const exponent = /^[eE][+-]?\d/.test(rest) && /\d$/.test(source.slice(0, position));
    throw new Error(
      exponent
        ? `Unexpected "${rest[0]}" at character ${position + 1}: exponent notation like 1e3 is not supported; write the number in full.`
        : `Unexpected "${rest.slice(0, UNREAD_PREVIEW)}" at character ${position + 1}: an operator (+ - * /) is missing between two values. ${SUPPORTED}`,
    );
  }
  function collect(expr: Expr) {
    if (expr.kind === 'ref') refs.add(expr.id);
    if (expr.kind === 'binary') { collect(expr.left); collect(expr.right); }
    if (expr.kind === 'unary') collect(expr.expr);
    if (expr.kind === 'sum') expr.args.forEach(collect);
  }
  collect(parsed);
  return { expression: parsed, refs: [...refs].sort(), aggregation, passThrough: parsed.kind === 'ref' };
}

export function evaluateFormula(expr: Expr, resolve: (id: string) => number): number {
  let result: number;
  switch (expr.kind) {
    case 'number': result = expr.value; break;
    case 'ref': result = resolve(expr.id); break;
    case 'unary': result = expr.sign * evaluateFormula(expr.expr, resolve); break;
    case 'sum': result = expr.args.reduce((sum, item) => sum + evaluateFormula(item, resolve), 0); break;
    case 'binary': {
      const left = evaluateFormula(expr.left, resolve), right = evaluateFormula(expr.right, resolve);
      if (expr.op === '/' && right === 0) throw new Error('Division by zero: change the denominator.');
      result = expr.op === '+' ? left + right : expr.op === '-' ? left - right : expr.op === '*' ? left * right : left / right;
      break;
    }
  }
  if (!Number.isFinite(result)) throw new Error('Result must be finite; reduce the magnitude of the inputs.');
  return result;
}
