'use client';

import { useRef, useState } from 'react';
import type { InfluenceReport } from '@/lib/projects/intake-triage/influence';
import type { Signals } from '@/lib/projects/intake-triage/signals';
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
  const labRef = useRef<HTMLDivElement>(null);

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
          const lab = labRef.current;
          if (lab && lab.getBoundingClientRect().top > window.innerHeight) {
            const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            lab.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
          }
        }}
      />
      <div ref={labRef} className={styles.labAnchor}>
        <SignalLab
          signals={signals}
          fixtureId={fixtureId}
          focus={focus}
          onSignals={(next, id) => {
            setSignals(next);
            setFixtureId(id);
            if (id !== null) setFocus(null);
          }}
        />
      </div>
    </div>
  );
}
