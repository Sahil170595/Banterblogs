// Largest-Triangle-Three-Buckets decimation for timeseries points
export interface Point { t: number; y: number }

export function lttb(points: Point[], threshold: number): Point[] {
  const n = points.length;
  if (threshold >= n || threshold === 0) return points.slice();
  const sampled: Point[] = [];
  let a = 0; // always add the first point
  sampled.push(points[a]);
  const bucketSize = (n - 2) / (threshold - 2);
  for (let i = 0; i < threshold - 2; i++) {
    const start = Math.floor((i + 1) * bucketSize) + 1;
    const end = Math.floor((i + 2) * bucketSize) + 1;
    const avgRangeStart = start;
    const avgRangeEnd = end;
    let avgT = 0, avgY = 0;
    const avgRangeLength = Math.max(1, avgRangeEnd - avgRangeStart);
    for (let j = avgRangeStart; j < avgRangeEnd; j++) { avgT += points[j].t; avgY += points[j].y; }
    avgT /= avgRangeLength; avgY /= avgRangeLength;

    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;
    let maxArea = -1; let nextA = rangeStart;
    for (let j = rangeStart; j < rangeEnd; j++) {
      const area = Math.abs((points[a].t - avgT) * (points[j].y - points[a].y) - (points[a].t - points[j].t) * (avgY - points[a].y));
      if (area > maxArea) { maxArea = area; nextA = j; }
    }
    sampled.push(points[nextA]);
    a = nextA;
  }
  sampled.push(points[n - 1]); // last point
  return sampled;
}


