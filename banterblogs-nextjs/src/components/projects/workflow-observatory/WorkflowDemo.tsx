'use client';

import { useEffect, useRef, useState } from 'react';
import { SCENARIOS, type Scenario } from '@/lib/projects/workflow-observatory/scenarios';
import { controls } from '../controls';
import { EvidenceTable } from './EvidenceTable';
import { Observatory } from './Observatory';
import styles from './observatory.module.css';

// the opening attempt runs once the app's top is this far up the viewport
const IN_VIEW_MARGIN = '0px 0px -40% 0px';

/**
 * The workflow page's live demo: what each kind of evidence says about six
 * attempts, then the scheduling app with the selected attempt loaded. Picking
 * an attempt runs it; the opening one runs once the app scrolls into view.
 */
export function WorkflowDemo() {
  const [selected, setSelected] = useState<Scenario>(SCENARIOS[0]);
  // bumps on every pick, so picking the same attempt again starts it over
  const [picks, setPicks] = useState(0);
  const [seen, setSeen] = useState(false);
  const labRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lab = labRef.current;
    if (!lab || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        observer.disconnect();
      },
      { rootMargin: IN_VIEW_MARGIN },
    );
    observer.observe(lab);
    return () => observer.disconnect();
  }, []);

  function pick(scenario: Scenario) {
    setSelected(scenario);
    setPicks((n) => n + 1);
    const lab = labRef.current;
    if (lab && lab.getBoundingClientRect().top > window.innerHeight) {
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      lab.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
    }
  }

  return (
    <div className={styles.demo}>
      <EvidenceTable selected={selected.id} onSelect={pick} />
      <div className={styles.lab} ref={labRef}>
        <p className={styles.loaded}>
          <span>Loaded</span> {selected.label}
        </p>
        {!selected.executor && (
          <p className={controls.hint}>
            The executor follows its plan and never picks the wrong room. Open the form, enter the title, choose South lab and save it
            yourself, then read the completion gate.
          </p>
        )}
        <Observatory key={`${selected.id}:${picks}`} initial={selected.config} autoRun={selected.executor && (picks > 0 || seen)} />
      </div>
    </div>
  );
}
