// The project demos' shared controls. Their rules live in the project shell's
// sheet (app/reading.css, "demo-" classes), so every demo's controls match
// and no two demos share a module stylesheet.

export const controls = {
  row: 'demo-row',
  segmented: 'demo-segmented',
  button: 'demo-button',
  iconButton: 'demo-icon-button',
  field: 'demo-field',
  error: 'demo-error',
  hint: 'demo-hint',
} as const;

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
