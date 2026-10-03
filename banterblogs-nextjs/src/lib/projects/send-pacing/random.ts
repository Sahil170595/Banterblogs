// NumPy's legacy RandomState, which tempoledger seeds per scheduler: the
// MT19937 generator and the legacy normal (polar method, one value cached),
// exponential, gamma (Marsaglia and Tsang), uniform and masked-rejection
// integers, as numpy/random/src/legacy and mt19937 implement them.

const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER = 0x80000000;
const LOWER = 0x7fffffff;
const TWO_26 = 67108864;
const TWO_53 = 9007199254740992;
const GAMMA_SQUEEZE = 0.0331;

export interface RandomState {
  random(): number;
  normal(loc: number, scale: number): number;
  exponential(scale: number): number;
  gamma(shape: number, scale: number): number;
  uniform(low: number, high: number): number;
  /** an integer in [low, high), as randint(low, high) */
  randint(low: number, high: number): number;
}

export function randomState(seed: number): RandomState {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Seed must be between 0 and 2**32 - 1');
  const key = new Uint32Array(N);
  let s = seed >>> 0;
  for (let i = 0; i < N; i++) {
    key[i] = s;
    s = (Math.imul(1812433253, (s ^ (s >>> 30)) >>> 0) + i + 1) >>> 0;
  }
  let pos = N;
  let gauss = 0;
  let hasGauss = false;

  function generate() {
    let i = 0;
    let y: number;
    for (; i < N - M; i++) {
      y = (key[i] & UPPER) | (key[i + 1] & LOWER);
      key[i] = key[i + M] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
    }
    for (; i < N - 1; i++) {
      y = (key[i] & UPPER) | (key[i + 1] & LOWER);
      key[i] = key[i + (M - N)] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
    }
    y = (key[N - 1] & UPPER) | (key[0] & LOWER);
    key[N - 1] = key[M - 1] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
    pos = 0;
  }

  function nextUint32(): number {
    if (pos === N) generate();
    let y = key[pos++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  function nextDouble(): number {
    const a = nextUint32() >>> 5;
    const b = nextUint32() >>> 6;
    return (a * TWO_26 + b) / TWO_53;
  }

  function standardGauss(): number {
    if (hasGauss) {
      hasGauss = false;
      return gauss;
    }
    let x1: number;
    let x2: number;
    let r2: number;
    do {
      x1 = 2.0 * nextDouble() - 1.0;
      x2 = 2.0 * nextDouble() - 1.0;
      r2 = x1 * x1 + x2 * x2;
    } while (r2 >= 1.0 || r2 === 0.0);
    const f = Math.sqrt((-2.0 * Math.log(r2)) / r2);
    gauss = f * x1;
    hasGauss = true;
    return f * x2;
  }

  const standardExponential = () => -Math.log(1.0 - nextDouble());

  function standardGamma(shape: number): number {
    if (shape === 1.0) return standardExponential();
    if (shape <= 0) return 0;
    if (shape < 1.0) throw new Error('Shapes below 1 are not used by the scheduler');
    const b = shape - 1.0 / 3.0;
    const c = 1.0 / Math.sqrt(9 * b);
    for (;;) {
      let x: number;
      let v: number;
      do {
        x = standardGauss();
        v = 1.0 + c * x;
      } while (v <= 0.0);
      v = v * v * v;
      const u = nextDouble();
      if (u < 1.0 - GAMMA_SQUEEZE * (x * x) * (x * x)) return b * v;
      if (Math.log(u) < 0.5 * x * x + b * (1.0 - v + Math.log(v))) return b * v;
    }
  }

  function randint(low: number, high: number): number {
    const range = high - 1 - low;
    if (range < 0) throw new Error('low >= high');
    if (range === 0) return low;
    let mask = range;
    mask |= mask >>> 1;
    mask |= mask >>> 2;
    mask |= mask >>> 4;
    mask |= mask >>> 8;
    mask |= mask >>> 16;
    let value: number;
    do value = (nextUint32() & mask) >>> 0;
    while (value > range);
    return low + value;
  }

  return {
    random: nextDouble,
    normal: (loc, scale) => loc + scale * standardGauss(),
    exponential: (scale) => scale * standardExponential(),
    gamma: (shape, scale) => scale * standardGamma(shape),
    uniform: (low, high) => low + (high - low) * nextDouble(),
    randint,
  };
}
