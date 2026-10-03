import { COLLECTIONS, KINDS, TOPICS, type Filter, type SearchConfig } from '@/lib/projects/retrieval-ranking/engine';
import styles from './retrieval.module.css';

export function describeFilter(f: Filter): string {
  return `${f.field} ${f.field === 'year' ? '>=' : '='} ${f.value}${f.protected ? ' (protected)' : ''}`;
}

export default function FilterControls({ config, onChange }: { config: SearchConfig; onChange: (c: SearchConfig) => void }) {
  const update = (field: Filter['field'], value: string) => {
    const current = config.filters.find((f) => f.field === field);
    const filters = config.filters.filter((f) => f.field !== field);
    if (value) {
      const protectedValue = current?.protected ?? false;
      // Each native select is restricted to its schema enum; run validation remains authoritative.
      let filter: Filter;
      if (field === 'year') filter = { field, value: Number(value), protected: protectedValue };
      else if (field === 'kind') filter = { field, value: value as typeof KINDS[number], protected: protectedValue };
      else if (field === 'topic') filter = { field, value: value as typeof TOPICS[number], protected: protectedValue };
      else filter = { field, value: value as typeof COLLECTIONS[number], protected: protectedValue };
      filters.push(filter);
    }
    onChange({ ...config, filters });
  };
  const protect = (field: Filter['field'], checked: boolean) => onChange({
    ...config, filters: config.filters.map((f) => f.field === field ? { ...f, protected: checked } : f),
  });
  return <fieldset className={styles.filters}><legend>Attribute filters</legend>
    {(['year', 'kind', 'topic', 'collection'] as const).map((field) => {
      const filter = config.filters.find((f) => f.field === field);
      const label = field === 'year' ? 'Minimum year' : field[0].toUpperCase() + field.slice(1);
      const options = field === 'kind' ? KINDS : field === 'topic' ? TOPICS : COLLECTIONS;
      return <div className={styles.filterRow} key={field}>
        <label>{label}{field === 'year'
          ? <input type="number" min="2000" max="2030" value={filter?.value ?? ''} onChange={(e) => update(field, e.target.value)} />
          : <select value={filter?.value ?? ''} onChange={(e) => update(field, e.target.value)}><option value="">Any</option>{options.map((option) => <option key={option}>{option}</option>)}</select>}
        </label>
        <label className={styles.protect}><input type="checkbox" aria-label={`Protect ${field}`} disabled={!filter} checked={filter?.protected ?? false} onChange={(e) => protect(field, e.target.checked)} />Protect</label>
      </div>;
    })}
  </fieldset>;
}
