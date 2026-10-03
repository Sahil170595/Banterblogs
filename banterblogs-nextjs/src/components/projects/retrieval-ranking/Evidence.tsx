import type { Document, RankedRow, SearchConfig } from '@/lib/projects/retrieval-ranking/engine';
import styles from './retrieval.module.css';

export const formatScore = (n: number) => n.toFixed(6);

export default function Evidence({ row, doc, config }: { row: RankedRow; doc: Document; config: SearchConfig }) {
  return <section className={styles.evidence} aria-label="Selected document evidence">
    <div className={styles.sectionHeading}><h3>{doc.title}</h3><code>{doc.id}</code></div>
    <p className={styles.attributes}>{doc.year} / {doc.kind} / {doc.topic} / {doc.collection}</p>
    <p className={styles.document}>{doc.body}</p>
    <p className={styles.attributes}>Tags: {doc.tags.join(', ') || '(none)'}</p>
    <dl className={styles.metrics}>
      <div><dt>Body channel</dt><dd>{formatScore(row.bodyScore)}</dd></div>
      <div><dt>Title + tags</dt><dd>{formatScore(row.metadataScore)}</dd></div>
      <div><dt>Query coverage</dt><dd>{Math.round(row.coverage * 100)}%</dd></div>
      <div><dt>Retrieval position</dt><dd>{row.retrievalRank}</dd></div>
    </dl>
    <div className={styles.formula}>
      <strong>RRF contributions</strong>
      <p>Body: {row.bodyRank ? `1 / (${config.rrfK} + ${row.bodyRank}) = ${formatScore(1 / (config.rrfK + row.bodyRank))}` : 'absent = 0'}</p>
      <p>Title + tags: {row.metadataRank ? `1 / (${config.rrfK} + ${row.metadataRank}) = ${formatScore(1 / (config.rrfK + row.metadataRank))}` : 'absent = 0'}</p>
      <p>Sum: {formatScore(row.rrfScore)}</p>
    </div>
    <p className={row.violations.length ? styles.warning : styles.good}>
      {row.violations.length ? `Requested filter violations: ${row.violations.join(', ')}` : 'All requested attribute filters satisfied'}
    </p>
    {row.missingRequired.length > 0 && <p className={styles.warning}>Required tokens missing: {row.missingRequired.join(', ')}</p>}
    <div className={styles.tableScroll}>
      <table aria-label="Term evidence"><thead><tr><th>Token</th><th>TF</th><th>DF</th><th>IDF</th><th>Title</th><th>Tag</th><th>Body +</th><th>Metadata +</th></tr></thead>
        <tbody>{row.terms.map((t) => <tr key={t.token}><th scope="row">{t.token}</th><td>{t.tf}</td><td>{t.df}</td><td>{t.idf.toFixed(3)}</td><td>{t.title ? 'yes' : 'no'}</td><td>{t.tag ? 'yes' : 'no'}</td><td>{t.bodyContribution.toFixed(3)}</td><td>{t.metadataContribution.toFixed(3)}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}
