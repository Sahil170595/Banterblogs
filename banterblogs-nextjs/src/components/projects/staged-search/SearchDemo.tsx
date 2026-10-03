'use client';

import { useRef, useState } from 'react';
import { EXAMPLE_QUERY } from '@/lib/projects/staged-search/example';
import { DEFAULT_SETTINGS, type Query, type Settings } from '@/lib/projects/staged-search/schema';
import { revealResult } from '../reveal';
import { fromQuery, toQuery, type Draft } from './draft';
import { LadderTable } from './LadderTable';
import { SearchLab } from './SearchLab';
import styles from './search.module.css';

/**
 * The staged search page's live demo: the query at every relaxation
 * threshold, then the results of the picked one. Both read the same query, so
 * editing it under the hood redraws the ladder above.
 */
export function SearchDemo() {
  const [draft, setDraft] = useState<Draft>(() => fromQuery(EXAMPLE_QUERY));
  const [query, setQuery] = useState<Query>(EXAMPLE_QUERY);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const resultsRef = useRef<HTMLElement>(null);

  function editDraft(next: Draft) {
    setDraft(next);
    const read = toQuery(next);
    if (read.query) setQuery(read.query);
    setDraftError(read.error);
  }

  function load(nextQuery: Query, nextSettings: Settings) {
    setDraft(fromQuery(nextQuery));
    setQuery(nextQuery);
    setDraftError(null);
    setSettings(nextSettings);
  }

  return (
    <div className={styles.demo}>
      <LadderTable
        query={query}
        settings={settings}
        onPick={(threshold) => {
          setSettings({ ...settings, relax_threshold: threshold });
          revealResult(resultsRef.current);
        }}
      />
      <div className={styles.labAnchor}>
        <SearchLab
          draft={draft}
          query={query}
          draftError={draftError}
          settings={settings}
          onDraft={editDraft}
          onSettings={setSettings}
          onLoad={load}
          resultsRef={resultsRef}
        />
      </div>
    </div>
  );
}
