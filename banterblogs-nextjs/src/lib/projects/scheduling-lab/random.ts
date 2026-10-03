// Local Mulberry32 stream; no global random state or provider dependency.
export function randomStream(seed: number) {
  let state = seed >>> 0;
  function uniform() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (((value ^ (value >>> 14)) >>> 0) + 0.5) / 4294967296;
  }
  const normal = () => Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
  const exponential = (mean: number) => -Math.log(uniform()) * mean;
  return { uniform, normal, exponential };
}
