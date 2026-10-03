'use client';

import { useEffect, useRef, useState } from 'react';
import type { Config } from '@/lib/projects/workflow-observatory/engine';
import { SCENARIOS, type Scenario } from '@/lib/projects/workflow-observatory/scenarios';
import { controls } from '../controls';
import { revealResult } from '../reveal';
import { EvidenceTable } from './EvidenceTable';
import { Observatory } from './Observatory';
import styles from './observatory.module.css';

// the opening attempt runs once the app's top is this far up the viewport
const IN_VIEW_MARGIN = '0px 0px -40% 0px';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const ROOM_LABELS: Record<Config['room'], string> = { north: 'North lab', south: 'South lab' };

const sameConfig = (a: Config, b: Config) => (Object.keys(a) as (keyof Config)[]).every((key) => a[key] === b[key]);

/**
 * The workflow page's live demo: what each kind of evidence says about six
 * attempts, then the scheduling app with the selected attempt loaded. Picking
 * an attempt runs it; the opening one runs once the app scrolls into view,
 * unless motion is reduced. Settings changed in the app make it a run of the
 * visitor's own, and the table stops claiming an attempt.
 */
export function WorkflowDemo() {
  const [selected, setSelected] = useState<Scenario>(SCENARIOS[0]);
  // bumps on every pick, so picking the same attempt again starts it over
  const [picks, setPicks] = useState(0);
  const [seen, setSeen] = useState(false);
  // the app's settings when they depart from the attempt's
  const [custom, setCustom] = useState<Config | null>(null);
  const [hoodOpen, setHoodOpen] = useState(false);
  const labRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lab = labRef.current;
    if (!lab || typeof IntersectionObserver === 'undefined') return;
    // a run that starts by itself is motion: under reduced motion it waits for a pick or Run
    if (typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches) return;
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
    setCustom(null);
    setPicks((n) => n + 1);
    revealResult(labRef.current);
  }

  const byHand = !custom && !selected.executor;

  return (
    <div className={styles.demo}>
      <EvidenceTable selected={custom ? null : selected.id} onSelect={pick} />
      <div className={styles.lab} ref={labRef}>
        <p className={styles.loaded}>
          <span>Loaded in the app</span>{' '}
          {custom ? `Your own settings: book ${ROOM_LABELS[custom.room]} for “${custom.title}”` : selected.label}
        </p>
        {byHand && (
          <p className={controls.lead}>
            <strong>Make this one by hand.</strong> The executor, the program that clicks and types through the app, follows its plan and never
            picks the wrong room. Click Reserve slot, type &ldquo;{selected.config.title}&rdquo;, choose South lab and save; the status line
            then gives the completion gate&apos;s verdict.
          </p>
        )}
        <Observatory
          key={`${selected.id}:${picks}`}
          initial={selected.config}
          autoRun={selected.executor && (picks > 0 || seen)}
          byHand={byHand}
          onConfigChange={(config) => setCustom(sameConfig(config, selected.config) ? null : config)}
          hoodOpen={hoodOpen}
          onHoodToggle={setHoodOpen}
        />
      </div>
    </div>
  );
}
