'use client';

import { saveAs } from 'file-saver';

export function ExportButtons({ csv, svg, filenameBase }: { csv?: string; svg?: string; filenameBase: string }) {
  const onCSV = () => {
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${filenameBase}.csv`);
  };
  const onSVG = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    saveAs(blob, `${filenameBase}.svg`);
  };
  return (
    <div className="mt-2 flex gap-2 text-xs">
      {csv && (
        <button onClick={onCSV} className="rounded-md border border-border/60 px-2 py-1 hover:bg-muted/40">Export CSV</button>
      )}
      {svg && (
        <button onClick={onSVG} className="rounded-md border border-border/60 px-2 py-1 hover:bg-muted/40">Export SVG</button>
      )}
    </div>
  );
}



