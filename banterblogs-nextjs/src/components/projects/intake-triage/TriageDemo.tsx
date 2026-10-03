'use client';

import { useEffect, useRef, useState } from 'react';
import type { InfluenceReport } from '@/lib/projects/intake-triage/influence';
import type { Signals } from '@/lib/projects/intake-triage/signals';
import { revealResult } from '../reveal';
import { InfluenceTable } from './InfluenceTable';
import { OPENING_FIXTURE, SignalLab } from './SignalLab';
import styles from './triage.module.css';

/**
 * The triage page's live demo: what each signal can change across every
 * combination, then the scorer itself, opened on a fixture message. Loading
 * an example puts its combination in the scorer with the deciding signal
 * marked.
 */
export function TriageDemo({ report }: { report: InfluenceReport }) {
  const [signals, setSignals] = useState<Signals>(OPENING_FIXTURE.signals);
  const [fixtureId, setFixtureId] = useState<string | null>(OPENING_FIXTURE.id);
  const [focus, setFocus] = useState<string | null>(null);
  // where signals the visitor did not pick from the examples came from: a table row, or their own changes
  const [origin, setOrigin] = useState<string | null>(null);
  // bumps on each table example, so the signal it marks is brought into view once it is drawn
  const [revealed, setRevealed] = useState(0);
  const labRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!revealed) return;
    const lab = labRef.current;
    revealResult(lab?.querySelector<HTMLElement>('[data-focus]') ?? lab);
  }, [revealed]);

  return (
    <div className={styles.demo}>
      <InfluenceTable
        report={report}
        selected={focus}
        onSelect={({ signal, example }) => {
          if (!example) return;
          setSignals(example.signals);
          setFixtureId(null);
          setFocus(signal.id);
          setOrigin(`From the table: ${signal.label}`);
          setRevealed((n) => n + 1);
        }}
      />
      <div ref={labRef} className={styles.labAnchor}>
        <SignalLab
          signals={signals}
          fixtureId={fixtureId}
          origin={origin}
          focus={focus}
          onSignals={(next, id) => {
            setSignals(next);
            setFixtureId(id);
            setOrigin(null);
            // any change lets go of the table example: its row is no longer what the scorer shows
            setFocus(null);
          }}
        />
      </div>
    </div>
  );
}
