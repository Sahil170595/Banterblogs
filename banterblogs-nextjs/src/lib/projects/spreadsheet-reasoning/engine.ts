import { z } from 'zod';
import { ballotRecord, fixtures } from './fixtures';
import { evaluateFormula, parseFormula } from './formula';
import { cellId, sessionSchema, type Analysis, type Session, type Vote } from './types';

// Covers all 48 bounded cells, including worst-case JSON escaping of input and label fields.
export const MAX_TRACE_BYTES = 150_000;
const traceSchema = z.object({ version: z.literal('spreadsheet-reasoning/v1'), session: sessionSchema });

export function freshSession(fixture: Session['fixture'] = 'baseline'): Session {
  return { fixture, workbook: structuredClone(fixtures[fixture].workbook), policy: 'balanced', adjudications: {} };
}

export function analyze(input: Session): Analysis {
  const session = sessionSchema.parse(input);
  const { workbook } = session;
  const sheetNames = workbook.sheets.map(s => s.name);
  if (new Set(sheetNames).size !== sheetNames.length) throw new Error('Duplicate sheet names.');
  const ids = workbook.cells.map(cellId);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate cell addresses.');
  if (workbook.cells.some(c => !sheetNames.includes(c.sheet))) throw new Error('Every cell must belong to a declared sheet.');
  const cells: Analysis['cells'] = {};
  const parsed: Record<string, ReturnType<typeof parseFormula>> = {};
  for (const cell of workbook.cells) {
    const id = cellId(cell);
    cells[id] = { id, value: null, error: null, precedents: [], dependents: [], votes: [], proposed: 'invalid', label: 'invalid', route: '' };
    try {
      if (!cell.input.trim().startsWith('=') && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(cell.input.trim())) throw new Error('Enter a finite number or a formula starting with =.');
      parsed[id] = parseFormula(cell.input, cell.sheet);
      cells[id].precedents = parsed[id].refs;
    } catch (error) {
      cells[id].error = error instanceof Error ? error.message : 'Formula parsing failed.';
    }
  }
  const edges: Analysis['edges'] = [];
  for (const id of ids) for (const ref of cells[id].precedents) {
    if (!cells[ref]) { cells[id].error = `Unknown reference ${ref}. Use an existing cell address.`; continue; }
    cells[ref].dependents.push(id);
    edges.push({ from: ref, to: id });
  }
  const finished = new Set<string>();
  const stack: string[] = [];
  function resolve(id: string): number {
    const cell = cells[id];
    if (cell.error) throw new Error(cell.error);
    if (finished.has(id)) return cell.value!;
    if (stack.includes(id)) {
      const cycle = [...stack.slice(stack.indexOf(id)), id];
      const message = `Cycle detected: ${cycle.join(' -> ')}. Break one formula link.`;
      for (const member of cycle) cells[member].error = message;
      throw new Error(message);
    }
    stack.push(id);
    try {
      cell.value = evaluateFormula(parsed[id].expression, ref => {
        try { return resolve(ref); }
        catch (error) { throw new Error(`Dependency ${ref}: ${error instanceof Error ? error.message : 'evaluation failed'}`); }
      });
      finished.add(id);
      return cell.value;
    } catch (error) {
      cell.error ??= error instanceof Error ? error.message : 'Evaluation failed.';
      cell.value = null;
      throw error;
    } finally { stack.pop(); }
  }
  for (const id of ids) {
    // Errors are retained on the cell; independent components still evaluate.
    try { resolve(id); } catch (error) { cells[id].error ??= error instanceof Error ? error.message : 'Evaluation failed.'; }
  }
  for (const source of workbook.cells) {
    const id = cellId(source), cell = cells[id];
    if (cell.error) { cell.route = 'Blocked: invalid computation'; continue; }
    const formula = source.input.trim().startsWith('='), info = parsed[id];
    const lexical = /\b(total|net|output)\b/i.test(source.label);
    const vote = (method: string, yes: boolean, decision: Vote, evidence: string) => cell.votes.push({ method, vote: yes ? decision : 'abstain', evidence });
    vote('Dependency sink', formula && cell.dependents.length === 0, 'final', `${cell.dependents.length} downstream consumers`);
    vote('Range aggregation', info.aggregation, 'final', info.aggregation ? 'SUM over a contiguous range' : 'No range aggregation');
    vote('Output lexicon', lexical, 'final', lexical ? 'Label contains total, net, or output' : 'No output term in label');
    vote('Input literal', !formula, 'intermediate', formula ? 'Formula' : 'Editable numeric input');
    vote('Pass-through', formula && info.passThrough, 'intermediate', info.passThrough ? 'Single-cell reference computes no new quantity' : 'Not a bare reference');
    vote('Consumed downstream', cell.dependents.length > 0, 'intermediate', `${cell.dependents.length} downstream consumers`);
    vote('Emphasized checkpoint', source.emphasis && (lexical || info.aggregation), 'final', source.emphasis ? 'Emphasis with semantic evidence required' : 'No emphasis');
    const positive = cell.votes.filter(v => v.vote === 'final').length;
    const negative = cell.votes.filter(v => v.vote === 'intermediate').length;
    const support = workbook.sheets.find(s => s.name === source.sheet)!.role === 'support';
    cell.route = support ? 'Support-sheet gate' : session.policy === 'precision' ? 'Precision: final requires no negative votes' : 'Balanced: positive votes must outnumber negative votes';
    cell.proposed = support ? 'intermediate' : positive > negative && (session.policy === 'balanced' || negative === 0) ? 'final' : negative > positive ? 'intermediate' : 'review';
    cell.label = cell.proposed;
    if (session.adjudications[id] === 'drop' && cell.proposed === 'final') cell.label = 'intermediate';
  }
  for (const id of Object.keys(session.adjudications)) {
    if (!cells[id] || cells[id].proposed !== 'final') throw new Error(`Adjudication accepts proposed finals only: ${id}. Clear stale decisions after edits.`);
  }
  return { cells, edges };
}

export function prune(input: Session, id: string, verdict: 'keep' | 'drop'): Session {
  const session = sessionSchema.parse(input);
  const result = analyze(session);
  if (!result.cells[id] || result.cells[id].proposed !== 'final') throw new Error('Adjudication accepts proposed finals only.');
  return { ...session, adjudications: { ...session.adjudications, [id]: verdict } };
}

export function fixtureMatches(session: Session): boolean {
  return JSON.stringify(session.workbook) === JSON.stringify(fixtures[session.fixture].workbook);
}
export function recordedVotes(session: Session): Record<string, Vote[]> | null {
  return session.fixture === 'baseline' && fixtureMatches(session) ? structuredClone(ballotRecord) : null;
}
export function compareGold(session: Session, result: Analysis) {
  const gold = fixtures[session.fixture].gold;
  if (!gold || !fixtureMatches(session)) return null;
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const cell of Object.values(result.cells)) {
    const expected = (gold as readonly string[]).includes(cell.id), actual = cell.label === 'final';
    if (expected && actual) tp++;
    else if (actual) fp++;
    else if (expected) fn++;
    else tn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : null;
  const recall = tp + fn > 0 ? tp / (tp + fn) : null;
  const f1 = 2 * tp + fp + fn > 0 ? 2 * tp / (2 * tp + fp + fn) : null;
  return { tp, fp, fn, tn, precision, recall, f1, review: Object.values(result.cells).filter(c => c.label === 'review').length };
}
export function exportTrace(input: Session) {
  const session = sessionSchema.parse(input);
  analyze(session);
  return { version: 'spreadsheet-reasoning/v1' as const, session };
}

export function replayTrace(input: unknown): Session {
  // Legacy expanded traces remain readable; derived evidence is never trusted or retained.
  const { session } = traceSchema.parse(input);
  analyze(session);
  return session;
}
