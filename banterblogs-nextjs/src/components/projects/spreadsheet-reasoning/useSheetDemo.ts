'use client';

import { useMemo, useState } from 'react';
import { analyze, compareGold, exportTrace, freshSession, MAX_TRACE_BYTES, prune, recordedVotes, replayTrace } from '@/lib/projects/spreadsheet-reasoning/engine';
import { cellId, type Session } from '@/lib/projects/spreadsheet-reasoning/types';

// The demo's state: the evaluated session the graph and evidence show, the
// draft the visitor edits until they recalculate, and the selected cell.

/** the page opens on the cell the balanced rules wrongly call final */
export const OPENING_CELL = 'Report!B4';

export function useSheetDemo() {
  const [run, setRun] = useState<Session>(() => freshSession());
  const [draft, setDraft] = useState<Session>(() => freshSession());
  const [selected, setSelected] = useState(OPENING_CELL);
  const result = useMemo(() => analyze(run), [run]);
  const pending = JSON.stringify(draft) !== JSON.stringify(run);

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
    selected,
    score: compareGold(run, result),
    ballots: recordedVotes(run),
    select: setSelected,
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
        const message = cause instanceof Error ? cause.message : 'That adjudication was refused.';
        console.warn('Spreadsheet adjudication refused:', message, id);
        return message;
      }
    },
    /** change the draft workbook; results wait for recalculation */
    edit(next: Session) {
      setDraft({ ...next, adjudications: {} });
    },
    /** evaluate the draft; returns why it was refused, if it was */
    recalculate(): string | null {
      try {
        analyze(draft);
        setRun(structuredClone(draft));
        return null;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Invalid workbook.';
        console.warn('Spreadsheet recalculation refused:', message);
        return message;
      }
    },
    reset(fixture: Session['fixture'] = run.fixture) {
      commit(freshSession(fixture));
      setSelected(fixture === 'baseline' ? OPENING_CELL : cellId(freshSession(fixture).workbook.cells[0]));
    },
    exportJson: () => JSON.stringify(exportTrace(run)),
    /** replay an exported trace, recomputing every result; returns why it was refused, if it was */
    async importTrace(file: File): Promise<string | null> {
      try {
        if (file.size > MAX_TRACE_BYTES) throw new Error(`Trace exceeds the ${MAX_TRACE_BYTES / 1000} KB limit.`);
        const next = replayTrace(JSON.parse(await file.text()));
        commit(next);
        setSelected(cellId(next.workbook.cells[0]));
        return null;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Invalid JSON trace.';
        console.warn('Spreadsheet replay refused:', message);
        return message;
      }
    },
  };
}

export type SheetDemo = ReturnType<typeof useSheetDemo>;
