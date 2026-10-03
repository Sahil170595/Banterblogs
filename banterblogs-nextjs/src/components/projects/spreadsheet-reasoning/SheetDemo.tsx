'use client';

import { FinalityGraph } from './FinalityGraph';
import { Inspector } from './Inspector';
import { useSheetDemo } from './useSheetDemo';
import styles from './sheet.module.css';

/**
 * The spreadsheet page's live demo: the workbook's dependency graph labelled
 * by the rules, then the evidence for whichever cell is selected.
 */
export function SheetDemo() {
  const demo = useSheetDemo();
  return (
    <div className={styles.demo}>
      <FinalityGraph demo={demo} />
      <Inspector demo={demo} />
    </div>
  );
}
