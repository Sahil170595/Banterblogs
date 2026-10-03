'use client';

import { useMemo, useRef, useState } from 'react';
import { analyze, compareGold, exportTrace, freshSession, MAX_TRACE_BYTES, prune, recordedVotes, replayTrace } from '@/lib/projects/spreadsheet-reasoning/engine';
import { cellId, type Session } from '@/lib/projects/spreadsheet-reasoning/types';
import { describeRefusal } from '../refusal';
import { revealResult } from '../reveal';

// The demo's state: the evaluated session the graph and evidence show, the
// draft the visitor edits until they recalculate, and the selected cell.

/** the page opens on the cell the balanced rules wrongly call final */
export const OPENING_CELL = 'Report!B4';

/** what in the draft would stop a recalculation, named by cell, before the engine sees it */
function draftIssue(draft: Session): string | null {
  for (const cell of draft.workbook.cells) {
    const id = cellId(cell);
    if (!cell.input.trim()) return `${id}: enter a value or a formula.`;
    if (!cell.label.trim()) return `${id}: the row label cannot be empty.`;
  }
  return null;
}

function refused(context: string, cause: unknown): string {
  const message = describeRefusal(cause);
  console.warn(`Spreadsheet ${context} refused:`, message);
  return message;
}

export function useSheetDemo() {
  const [run, setRun] = useState<Session>(() => freshSession());
  const [draft, setDraft] = useState<Session>(() => freshSession());
  const [selected, setSelected] = useState(OPENING_CELL);
  // the inspector's evidence, brought into view when a cell is picked in the graph
  const evidenceRef = useRef<HTMLElement>(null);
  const result = useMemo(() => analyze(run), [run]);
  const pending = JSON.stringify(draft) !== JSON.stringify(run);
  const issue = pending ? draftIssue(draft) : null;
  // the cells whose draft differs from what was last calculated
  const edited = new Set(
    draft.workbook.cells.filter((cell) => JSON.stringify(cell) !== JSON.stringify(run.workbook.cells.find((c) => cellId(c) === cellId(cell)))).map(cellId),
  );

  /** a new evaluated session; the draft follows it */
  const commit = (next: Session) => {
    setRun(next);
    setDraft(next);
  };

  return {
    run,
    draft,
    result,
    pending,
    /** why the draft cannot be recalculated yet, if it cannot */
    issue,
    edited,
    selected,
    evidenceRef,
    score: compareGold(run, result),
    ballots: recordedVotes(run),
    select: setSelected,
    /** pick a cell and bring its evidence into view */
    inspect(id: string) {
      setSelected(id);
      revealResult(evidenceRef.current);
    },
    /** switch the rule policy; adjudications are made under one policy, so they clear */
    setPolicy(policy: Session['policy']) {
      commit({ ...run, policy, adjudications: {} });
    },
    /** prune-only review of a proposed final; returns why it was refused, if it was */
    adjudicate(id: string, verdict: 'keep' | 'drop' | null): string | null {
      try {
        if (verdict) commit(prune(run, id, verdict));
        else {
          const adjudications = { ...run.adjudications };
          delete adjudications[id];
          commit({ ...run, adjudications });
        }
        return null;
      } catch (cause) {
        return refused('adjudication', cause);
      }
    },
    /** replace every review decision at once: {} clears them all */
    setReview(adjudications: Session['adjudications']): string | null {
      try {
        const next = { ...run, adjudications };
        analyze(next);
        commit(next);
        return null;
      } catch (cause) {
        return refused('review', cause);
      }
    },
    /** change the draft workbook; results wait for recalculation */
    edit(next: Session) {
      setDraft({ ...next, adjudications: {} });
    },
    /** evaluate the draft; returns why it was refused, if it was */
    recalculate(): string | null {
      if (issue) return issue;
      try {
        analyze(draft);
        setRun(structuredClone(draft));
        return null;
      } catch (cause) {
        return refused('recalculation', cause);
      }
    },
    reset(fixture: Session['fixture'] = run.fixture) {
      commit(freshSession(fixture));
      setSelected(fixture === 'baseline' ? OPENING_CELL : cellId(freshSession(fixture).workbook.cells[0]));
    },
    exportJson: () => JSON.stringify(exportTrace(run)),
    /** replay an exported file, recomputing every result; returns why it was refused, if it was */
    async importTrace(file: File): Promise<string | null> {
      try {
        if (file.size > MAX_TRACE_BYTES) throw new Error(`The file is over the ${MAX_TRACE_BYTES / 1000} KB limit.`);
        const next = replayTrace(JSON.parse(await file.text()));
        commit(next);
        setSelected(cellId(next.workbook.cells[0]));
        return null;
      } catch (cause) {
        return refused('replay', cause);
      }
    },
  };
}

export type SheetDemo = ReturnType<typeof useSheetDemo>;
