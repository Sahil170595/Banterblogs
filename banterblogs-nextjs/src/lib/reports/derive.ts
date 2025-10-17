import fs from 'fs';
import path from 'path';

function extractArray(label: string, html: string): number[] | null {
  // Match the block for a given Plotly trace name and capture its "text" numeric array
  const nameIdx = html.indexOf(`"name":"${label}"`);
  if (nameIdx === -1) return null;
  const slice = html.slice(nameIdx, nameIdx + 2000);
  const m = slice.match(/"text":\[(.*?)\]/);
  if (!m) return null;
  const raw = m[1];
  // Split by comma, strip quotes
  const vals = raw.split(',').map((s) => Number(s.replace(/[^0-9eE+\-.]/g, ''))).filter((n) => Number.isFinite(n));
  return vals;
}

function extractCategories(html: string): string[] | null {
  const m = html.match(/"x":\[("[^"]+"(?:,\s*"[^"]+")*)\]/);
  if (!m) return null;
  return m[1].split(',').map((s) => s.replace(/(^\s*"|"\s*$)/g, ''));
}

function corr(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const xa = a[i] - ma; const xb = b[i] - mb; num += xa * xb; da += xa * xa; db += xb * xb; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

export function deriveTR108(folder: string) {
  const f = path.join(folder, 'quantization_comparison.html');
  if (!fs.existsSync(f)) throw new Error('missing TR108 quantization_comparison.html');
  const html = fs.readFileSync(f, 'utf8');

  const categories = extractCategories(html) || [];
  const throughput = extractArray('Throughput', html) || [];
  const ttft = extractArray('TTFT', html) || [];
  const load = extractArray('Load Time', html) || [];
  const evalt = extractArray('Eval Time', html) || [];

  if (!throughput.length) throw new Error('unable to extract TR108 values');

  const toSeries = (name: string, vals: number[]) => ({ name, points: vals.map((y, i) => ({ t: i, y })) });
  const timeseries = {
    series: [toSeries('Throughput (tokens/s)', throughput), toSeries('TTFT (s)', ttft), toSeries('Load (s)', load), toSeries('Eval (s)', evalt)],
    annotations: categories.length ? categories.map((label, idx) => ({ x: idx, label })) : undefined,
  };

  // Build a basic histogram from TTFT
  const arr = ttft.length ? ttft : throughput;
  const min = Math.min(...arr), max = Math.max(...arr);
  const bins = 10;
  const bw = (max - min) / (bins || 1) || 1;
  const counts = new Array(bins).fill(0);
  arr.forEach((v) => {
    const idx = Math.max(0, Math.min(bins - 1, Math.floor((v - min) / bw)));
    counts[idx]++;
  });
  const distribution = { buckets: counts.map((c, i) => ({ x0: min + i * bw, x1: min + (i + 1) * bw, count: c })) };

  const variables = ['Throughput', 'TTFT', 'Load', 'Eval'];
  const matrix = [throughput, ttft, load, evalt].map((row) => [throughput, ttft, load, evalt].map((col) => corr(row, col)));
  const correlation = { variables, matrix };

  return { timeseries, distribution, correlation };
}

// Generic Plotly extractor: attempts to derive data from the first Plotly.newPlot block
export function deriveFromAnyPlotly(folder: string) {
  const htmlFiles = fs.readdirSync(folder).filter((f) => f.endsWith('.html'));
  if (!htmlFiles.length) throw new Error('no_html_exports');
  const full = htmlFiles.map((f) => ({ f, s: fs.readFileSync(path.join(folder, f), 'utf8') }));

  // Find a Plotly.newPlot(...) block with traces
  let html = '';
  for (const { s } of full) {
    if (s.includes('Plotly.newPlot(')) { html = s; break; }
  }
  if (!html) throw new Error('no_plotly_block');

  // Try to extract categories and up to 4 traces by name or first traces
  const categories = extractCategories(html) || [];

  // Capture multiple trace names present in the block
  const nameMatches = Array.from(html.matchAll(/"name":"([^"]+)"/g)).map((m) => m[1]);
  const uniqueNames: string[] = Array.from(new Set(nameMatches)).slice(0, 4);

  const traces: { name: string; values: number[] }[] = [];
  for (const n of uniqueNames) {
    const vals = extractArray(n, html);
    if (vals && vals.length) traces.push({ name: n, values: vals });
  }
  // Fallback: if no names extracted, try generic first "text" array
  if (!traces.length) {
    const m = html.match(/"text":\[(.*?)\]/);
    if (m) {
      const vals = m[1].split(',').map((s) => Number(s.replace(/[^0-9eE+\-.]/g, ''))).filter((n) => Number.isFinite(n));
      traces.push({ name: 'Series 1', values: vals });
    }
  }
  if (!traces.length) throw new Error('no_traces_parsed');

  const toSeries = (name: string, vals: number[]) => ({ name, points: vals.map((y, i) => ({ t: i, y })) });
  const timeseries = {
    series: traces.map((t) => toSeries(t.name, t.values)),
    annotations: categories.length ? categories.map((label, idx) => ({ x: idx, label })) : undefined,
  };

  const primary = traces[0].values;
  const min = Math.min(...primary), max = Math.max(...primary);
  const bins = Math.min(20, Math.max(5, Math.round(Math.sqrt(primary.length))));
  const bw = (max - min) / (bins || 1) || 1;
  const counts = new Array(bins).fill(0);
  primary.forEach((v) => {
    const idx = Math.max(0, Math.min(bins - 1, Math.floor((v - min) / bw)));
    counts[idx]++;
  });
  const distribution = { buckets: counts.map((c, i) => ({ x0: min + i * bw, x1: min + (i + 1) * bw, count: c })) };

  const variables = traces.map((t) => t.name);
  const arrays = traces.map((t) => t.values);
  const matrix = arrays.map((row) => arrays.map((col) => corr(row, col)));
  const correlation = { variables, matrix };

  return { timeseries, distribution, correlation };
}


