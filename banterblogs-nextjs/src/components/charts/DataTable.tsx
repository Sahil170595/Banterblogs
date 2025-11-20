interface DataTableProps {
  rows: Array<Record<string, string | number>>;
  columns: Array<{ key: string; label: string }>;
  caption?: string;
}

export function DataTable({ rows, columns, caption }: DataTableProps) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border/50">
      <table className="min-w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-muted/30 text-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-background even:bg-muted/10">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 text-muted-foreground">
                  {String(row[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



