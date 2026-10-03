'use client';

import { useRef } from 'react';
import { revealWhenRendered } from '../reveal';
import { ControlBoard } from './ControlBoard';
import { ServiceLab } from './ServiceLab';
import { useServiceDemo } from './useServiceDemo';
import styles from './service.module.css';

/**
 * The customer-service page's live demo: every scored scripted trajectory,
 * then the environment with one of them loaded, for the visitor to replay,
 * rewind into a fresh episode or operate by hand.
 */
export function ServiceDemo() {
  const demo = useServiceDemo();
  const lab = useRef<HTMLDivElement>(null);
  return (
    <div className={styles.demo}>
      <ControlBoard
        controls={demo.controls}
        selected={demo.selected}
        onSelect={(control) => {
          demo.select(control);
          // the replay is below the board, off screen on a phone
          revealWhenRendered(() => lab.current);
        }}
      />
      <ServiceLab demo={demo} labRef={lab} />
    </div>
  );
}
