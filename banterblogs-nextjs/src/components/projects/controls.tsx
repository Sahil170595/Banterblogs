import styles from './controls.module.css';

// The project demos' shared controls. Class names for buttons, fields and
// messages come from the same module, so every demo's controls match.

export const controls = styles;

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
    <fieldset className={styles.segmented}>
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
