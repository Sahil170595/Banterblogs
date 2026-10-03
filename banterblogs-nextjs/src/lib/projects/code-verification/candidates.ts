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

// Each implementation as written, for the page to show: a production bundle
// minifies Function.toString(). engine.test.ts runs every text against its
// function on the suite and more, so the two cannot drift apart.
const INTERVAL_LOOP_HEAD = `  const sorted = input.map(([start, end]) => [start, end]).sort((a, b) => a[0] - b[0]);
  const output = [];
  for (const [start, end] of sorted) {
    const last = output[output.length - 1];`;
const UNIQUE_HEAD = `  const seen = new Set();
  return input.map((value) => value.trim()).filter((value) => {`;

export const CANDIDATE_SOURCES = {
  intervals: {
    empty: `function intervalBaseline(input) {
${INTERVAL_LOOP_HEAD}
    if (last && start < last[1]) last[1] = Math.max(last[1], end);
    else output.push([start, end]);
  }
  return output;
}`,
    fixed: `function intervalFixed(input) {
${INTERVAL_LOOP_HEAD}
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else output.push([start, end]);
  }
  return output;
}`,
    overfit: `function intervalOverfit(input) {
${INTERVAL_LOOP_HEAD}
    const familiar = last && last[0] === 1 && last[1] === 3 && start === 3 && end === 5;
    if (last && (start < last[1] || familiar)) last[1] = Math.max(last[1], end);
    else output.push([start, end]);
  }
  return output;
}`,
    regression: `function intervalRegression(input) {
${INTERVAL_LOOP_HEAD}
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else output.push([start, end]);
  }
  return output.reverse();
}`,
  },
  unique: {
    empty: `function uniqueBaseline(input) {
${UNIQUE_HEAD}
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}`,
    fixed: `function uniqueFixed(input) {
${UNIQUE_HEAD}
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}`,
    overfit: `function uniqueOverfit(input) {
${UNIQUE_HEAD}
    const key = value === 'ALPHA' ? 'alpha' : value;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}`,
    regression: `function uniqueRegression(input) {
${UNIQUE_HEAD}
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort();
}`,
  },
} as const;
