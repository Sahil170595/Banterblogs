import fs from 'fs';
import path from 'path';
import type { Timeseries, Distribution, Correlation } from './schemas';
import { asTimeseries, asDistribution, asCorrelation } from './adapters';
import { findReportLocations, type ReportLocation } from './locator';
import { readReportSections, type ReportSection } from './content';

interface SeriesPoint {
  index: number;
  value: number;
}

interface ColumnStat {
  key: string;
  display: string;
  values: SeriesPoint[];
  coverage: number;
  variance: number;
}

const MAX_SCAN_DEPTH = 3;
const MAX_RECORDS = 500;

export interface ReportCharts {
  timeseries: Timeseries;
  distribution: Distribution;
  correlation: Correlation;
}

export interface ReportData {
  charts?: ReportCharts;
  sections: ReportSection[];
  source: string;
  location: ReportLocation;
  issues: string[];
}

function validateCharts(charts: ReportCharts, rel: string, issues: string[]): boolean {
  let valid = true;
  const series = charts.timeseries.series;
  if (!Array.isArray(series) || series.length === 0) {
    issues.push(`Chart data in ${rel} contains no series`);
    valid = false;
  } else {
    series.forEach((s) => {
      if (!Array.isArray(s.points) || s.points.length === 0) {
        issues.push(`Series "${s.name}" in ${rel} has no data points`);
        valid = false;
      } else {
        s.points.forEach(({ t, y }, idx) => {
          if (!Number.isFinite(t) || !Number.isFinite(y)) {
            issues.push(`Series "${s.name}" in ${rel} contains non-numeric value at index ${idx}`);
            valid = false;
          }
        });
      }
    });
  }

  const { buckets } = charts.distribution;
  if (!Array.isArray(buckets) || buckets.length === 0) {
    issues.push(`Distribution data in ${rel} is empty`);
    valid = false;
  }

  const { variables, matrix } = charts.correlation;
  if (!Array.isArray(variables) || !Array.isArray(matrix) || variables.length !== matrix.length) {
    issues.push(`Correlation matrix in ${rel} is malformed`);
    valid = false;
  }

  return valid;
}

function toDisplayName(key: string) {
  const cleaned = key.replace(/[_\-.]+/g, ' ').trim();
  if (!cleaned) return key;
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function findFileRecursive(dir: string, filename: string, depth = 0): string | null {
  if (depth > MAX_SCAN_DEPTH) return null;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === filename) return full;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const result = findFileRecursive(path.join(dir, entry.name), filename, depth + 1);
    if (result) return result;
  }
  return null;
}

function safeReadJSON(filePath: string) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values.map((value) => value.trim().replace(/^"|"$/g, ''));
}

function readCsv(filePath: string) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]);
    const records: Record<string, number>[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cols = parseCsvLine(lines[i]);
      const record: Record<string, number> = {};
      for (let j = 0; j < headers.length && j < cols.length; j += 1) {
        const key = headers[j];
        if (!key) continue;
        const num = Number(cols[j]);
        if (Number.isFinite(num)) record[key] = num;
      }
      if (Object.keys(record).length) records.push(record);
      if (records.length >= MAX_RECORDS) break;
    }
    return records;
  } catch {
    return [];
  }
}

function prefixKeys(record: Record<string, number>, prefix: string) {
  const safePrefix = prefix.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
  if (!safePrefix) return record;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    out[`${safePrefix}.${key}`] = value;
  }
  return out;
}

function extractRecords(value: unknown): Record<string, number>[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractRecords(item));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const numeric: Record<string, number> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'number' && Number.isFinite(val)) {
        numeric[key] = val;
      }
    }
    const collected: Record<string, number>[] = [];
    if (Object.keys(numeric).length) {
      collected.push(numeric);
    }
    for (const [key, val] of Object.entries(obj)) {
      if (!val || typeof val !== 'object') continue;
      const nested = extractRecords(val);
      for (const nestedRecord of nested) {
        collected.push(prefixKeys(nestedRecord, key));
      }
    }
    return collected;
  }
  return [];
}

function collectNumericRecords(folder: string, depth = 0): Record<string, number>[] {
  if (depth > MAX_SCAN_DEPTH) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(folder, { withFileTypes: true });
  } catch {
    return [];
  }
  const records: Record<string, number>[] = [];
  for (const entry of entries) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      records.push(...collectNumericRecords(full, depth + 1));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const baseName = path.basename(entry.name, ext);
      if (ext === '.json' && entry.name.toLowerCase() !== 'meta.json') {
        const parsed = safeReadJSON(full);
        if (!parsed) continue;
        const extracted = extractRecords(parsed);
        for (const record of extracted) {
          records.push(prefixKeys(record, baseName));
          if (records.length >= MAX_RECORDS) break;
        }
      } else if (ext === '.csv') {
        const csvRecords = readCsv(full);
        for (const record of csvRecords) {
          records.push(prefixKeys(record, baseName));
          if (records.length >= MAX_RECORDS) break;
        }
      }
    }
    if (records.length >= MAX_RECORDS) break;
  }
  return records.slice(0, MAX_RECORDS);
}

function dedupeRecords(records: Record<string, number>[]) {
  const seen = new Set<string>();
  const unique: Record<string, number>[] = [];
  for (const record of records) {
    const key = Object.keys(record)
      .sort()
      .map((field) => `${field}:${record[field]}`)
      .join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(record);
  }
  return unique;
}

function buildColumns(records: Record<string, number>[]): ColumnStat[] {
  const columnMap = new Map<string, SeriesPoint[]>();
  records.forEach((record, index) => {
    for (const [key, value] of Object.entries(record)) {
      if (!Number.isFinite(value)) continue;
      if (!columnMap.has(key)) columnMap.set(key, []);
      columnMap.get(key)!.push({ index, value });
    }
  });

  const columns: ColumnStat[] = [];
  columnMap.forEach((values, key) => {
    if (!values.length) return;
    const coverage = values.length;
    const mean = values.reduce((acc, pt) => acc + pt.value, 0) / coverage;
    const variance = values.reduce((acc, pt) => acc + (pt.value - mean) ** 2, 0) / coverage;
    columns.push({
      key,
      display: toDisplayName(key),
      values,
      coverage,
      variance,
    });
  });

  return columns
    .filter((col) => col.coverage > 0)
    .sort((a, b) => {
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      return b.variance - a.variance;
    });
}

function buildDistribution(values: number[]): Distribution {
  if (!values.length) {
    return { buckets: [] };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { buckets: [] };
  }
  const range = max - min || 1;
  const bins = Math.min(30, Math.max(5, Math.round(Math.sqrt(values.length))));
  const bucketWidth = range / bins;
  const counts = new Array(bins).fill(0);
  values.forEach((value) => {
    const clamped = Math.max(min, Math.min(max, value));
    const idx = Math.min(bins - 1, Math.floor((clamped - min) / bucketWidth));
    counts[idx] += 1;
  });
  const buckets = counts.map((count, idx) => ({
    x0: min + idx * bucketWidth,
    x1: min + (idx + 1) * bucketWidth,
    count,
  }));
  return { buckets };
}

function computeCorrelation(records: Record<string, number>[], columns: ColumnStat[]): Correlation {
  const variables = columns.map((col) => col.display);
  const matrix = columns.map((colA) =>
    columns.map((colB) => {
      const paired: Array<{ a: number; b: number }> = [];
      records.forEach((record) => {
        const a = record[colA.key];
        const b = record[colB.key];
        if (Number.isFinite(a) && Number.isFinite(b)) {
          paired.push({ a, b });
        }
      });
      const n = paired.length;
      if (!n) return 0;
      const meanA = paired.reduce((acc, p) => acc + p.a, 0) / n;
      const meanB = paired.reduce((acc, p) => acc + p.b, 0) / n;
      let numerator = 0;
      let denomA = 0;
      let denomB = 0;
      for (const { a, b } of paired) {
        const da = a - meanA;
        const db = b - meanB;
        numerator += da * db;
        denomA += da * da;
        denomB += db * db;
      }
      if (!denomA || !denomB) return 0;
      return numerator / Math.sqrt(denomA * denomB);
    }),
  );
  return { variables, matrix };
}

function buildSeries(records: Record<string, number>[]): { timeseries: Timeseries; distribution: Distribution; correlation: Correlation } | null {
  const uniqueRecords = dedupeRecords(records);
  if (!uniqueRecords.length) return null;
  const columns = buildColumns(uniqueRecords).slice(0, 4);
  if (!columns.length) return null;
  const series = columns.map((col) => ({
    name: col.display,
    points: col.values.map((pt) => ({ t: pt.index, y: pt.value })),
  }));
  const distribution = buildDistribution(columns[0].values.map((pt) => pt.value));
  const correlation = computeCorrelation(uniqueRecords, columns);
  return {
    timeseries: asTimeseries({ series }),
    distribution: asDistribution(distribution),
    correlation: asCorrelation(correlation),
  };
}

function loadChartsFromDirectory(folder: string, issues: string[]): ReportCharts | null {
  const rel = path.relative(process.cwd(), folder) || folder;
  const timeseriesPath = findFileRecursive(folder, 'timeseries.json');
  if (timeseriesPath) {
    const distributionPath = findFileRecursive(folder, 'distribution.json');
    const correlationPath = findFileRecursive(folder, 'correlation.json');
    if (distributionPath && correlationPath) {
      const timeseriesRaw = safeReadJSON(timeseriesPath);
      const distributionRaw = safeReadJSON(distributionPath);
      const correlationRaw = safeReadJSON(correlationPath);
      if (!timeseriesRaw || !distributionRaw || !correlationRaw) {
        issues.push(`Failed to parse structured chart JSON in ${rel}`);
        return null;
      }
      try {
        const timeseries = asTimeseries(timeseriesRaw);
        const distribution = asDistribution(distributionRaw);
        const correlation = asCorrelation(correlationRaw);
        const charts: ReportCharts = { timeseries, distribution, correlation };
        if (!validateCharts(charts, rel, issues)) {
          return null;
        }
        return charts;
      } catch (error) {
        issues.push(`Invalid chart JSON schema in ${rel}: ${(error as Error).message}`);
        return null;
      }
    }
    issues.push(`Found timeseries.json but missing distribution.json or correlation.json in ${rel}`);
  }

  const numericRecords = collectNumericRecords(folder);
  if (!numericRecords.length) {
    issues.push(`No structured CSV/JSON metrics found in ${rel}`);
    return null;
  }
  const derived = buildSeries(numericRecords);
  if (derived) {
    if (!validateCharts(derived, rel, issues)) {
      return null;
    }
    return derived;
  }
  issues.push(`Unable to derive numeric series from ${path.relative(process.cwd(), folder) || folder}`);

  return null;
}
export async function loadReportData(id: string): Promise<ReportData | null> {
  const locations = findReportLocations(id);
  if (!locations.length) return null;

  const issues: string[] = [];
  let charts: ReportCharts | undefined;
  let chartLocation: ReportLocation | null = null;

  for (const candidate of locations) {
    if (candidate.kind !== 'directory') continue;
    const derived = loadChartsFromDirectory(candidate.path, issues);
    if (derived) {
      charts = derived;
      chartLocation = candidate;
      break;
    }
  }

  const sectionsMap = new Map<string, ReportSection>();
  for (const candidate of locations) {
    const sections = await readReportSections(id, candidate);
    for (const section of sections) {
      if (!sectionsMap.has(section.originKey)) {
        sectionsMap.set(section.originKey, section);
      }
    }
  }

  const primaryLocation = chartLocation ?? locations[0];
  const source = chartLocation?.source ?? locations[0].source;

  if (!charts) {
    issues.push(`No structured chart data found for report "${id}".`);
  }

  if (issues.length) {
    issues.forEach((issue) => {
      console.warn(`[reports] ${id}: ${issue}`);
    });
  }

  return {
    charts,
    sections: Array.from(sectionsMap.values()),
    source,
    location: primaryLocation,
    issues,
  };
}
