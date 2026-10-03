// The project demos' shared controls. Their rules live in the project shell's
// sheet (app/reading.css, "demo-" classes), so every demo's controls match
// and no two demos share a module stylesheet.

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export const controls = {
  row: 'demo-row',
  segmented: 'demo-segmented',
  button: 'demo-button',
  iconButton: 'demo-icon-button',
  /** an icon button's name, shown beside the icon on touch screens, which have no tooltip */
  iconLabel: 'demo-icon-label',
  field: 'demo-field',
  error: 'demo-error',
  hint: 'demo-hint',
  /** a short line before an exhibit: what to look at, what to click */
  lead: 'demo-lead',
  /**
   * a results table that becomes one card per row on a phone. Give the table
   * explicit roles (table, rowgroup, row, columnheader, rowheader, cell),
   * which survive the display change, and every cell a data-label naming its
   * column.
   */
  stackTable: 'demo-stack',
} as const;

/**
 * The parts of a demo an engineer wants and a first-time visitor does not:
 * settings, traces, raw records, import and export. Closed until opened.
 */
export function UnderTheHood({ summary = 'Under the hood', children }: { summary?: string; children: ReactNode }) {
  return (
    <details className="demo-under-hood">
      <summary>
        <ChevronRight aria-hidden="true" />
        {summary}
      </summary>
      <div>{children}</div>
    </details>
  );
}

export interface Choice<T> {
  value: T;
  label: string;
  /** a quieter qualifier after the label */
  note?: string;
}

/**
 * A one-of-few choice as a row of pills: native radios, so arrow keys move
 * between them. A null value checks none, for a state set some other way.
 */
export function Segmented<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className={controls.segmented}>
      <legend>{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value} data-checked={option.value === value || undefined}>
            <input type="radio" name={name} checked={option.value === value} onChange={() => onChange(option.value)} />
            {option.label}
            {option.note && <span>{option.note}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
