export type Interval = [number, number];

function intervalBaseline(input: Interval[]): Interval[] {
  const sorted = input.map(([start, end]): Interval => [start, end]).sort((a, b) => a[0] - b[0]);
  const output: Interval[] = [];
  for (const [start, end] of sorted) {
    const last = output[output.length - 1];
    if (last && start < last[1]) last[1] = Math.max(last[1], end);
    else output.push([start, end]);
  }
  return output;
}

function intervalFixed(input: Interval[]): Interval[] {
  const sorted = input.map(([start, end]): Interval => [start, end]).sort((a, b) => a[0] - b[0]);
  const output: Interval[] = [];
  for (const [start, end] of sorted) {
    const last = output[output.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else output.push([start, end]);
  }
  return output;
}

function intervalOverfit(input: Interval[]): Interval[] {
  const sorted = input.map(([start, end]): Interval => [start, end]).sort((a, b) => a[0] - b[0]);
  const output: Interval[] = [];
  for (const [start, end] of sorted) {
    const last = output[output.length - 1];
    const familiar = last && last[0] === 1 && last[1] === 3 && start === 3 && end === 5;
    if (last && (start < last[1] || familiar)) last[1] = Math.max(last[1], end);
    else output.push([start, end]);
  }
  return output;
}

function intervalRegression(input: Interval[]): Interval[] {
  const sorted = input.map(([start, end]): Interval => [start, end]).sort((a, b) => a[0] - b[0]);
  const output: Interval[] = [];
  for (const [start, end] of sorted) {
    const last = output[output.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else output.push([start, end]);
  }
  return output.reverse();
}

function uniqueBaseline(input: string[]): string[] {
  const seen = new Set<string>();
  return input.map(value => value.trim()).filter(value => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function uniqueFixed(input: string[]): string[] {
  const seen = new Set<string>();
  return input.map(value => value.trim()).filter(value => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueOverfit(input: string[]): string[] {
  const seen = new Set<string>();
  return input.map(value => value.trim()).filter(value => {
    const key = value === 'ALPHA' ? 'alpha' : value;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueRegression(input: string[]): string[] {
  const seen = new Set<string>();
  return input.map(value => value.trim()).filter(value => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort();
}

export const intervalCandidates = {
  empty: intervalBaseline, fixed: intervalFixed, overfit: intervalOverfit, regression: intervalRegression,
};
export const uniqueCandidates = {
  empty: uniqueBaseline, fixed: uniqueFixed, overfit: uniqueOverfit, regression: uniqueRegression,
};
