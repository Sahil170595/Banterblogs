'use client';

import { ControlBoard } from './ControlBoard';
import { ServiceLab } from './ServiceLab';
import { useServiceDemo } from './useServiceDemo';
import styles from './service.module.css';

/**
 * The customer-service page's live demo: every scored control trajectory,
 * then the environment with one of them loaded, for the visitor to replay,
 * rewind into a fresh episode or operate by hand.
 */
export function ServiceDemo() {
  const demo = useServiceDemo();
  return (
    <div className={styles.demo}>
      <ControlBoard controls={demo.controls} selected={demo.selected} onSelect={demo.select} />
      <ServiceLab demo={demo} />
    </div>
  );
}
