// Manrope's advance widths, in em, as the map draws them: measured in
// Chromium on the built /platform page (each glyph repeated 20 times through
// getComputedTextLength; the space by difference, since SVG collapses runs of
// it). Weight 400 is the edge labels and stack lines, 560 the node names with
// their -0.005em tracking. Summed per string they come within 1.4 units of
// the rendered width at 12-14px; kerning is the difference.
const ADVANCE_EM: Record<400 | 560, Record<string, number>> = {
  400: {
    '0': 0.6098, '1': 0.3899, '2': 0.5699, '3': 0.5529, '4': 0.5988, '5': 0.5773, '6': 0.6203, '7': 0.5272, '8': 0.5804, '9': 0.6203,
    ' ': 0.2002, A: 0.6682, B: 0.6128, C: 0.7153, D: 0.6713, E: 0.5699, F: 0.5034, G: 0.7048, H: 0.6843, I: 0.2334, J: 0.4634,
    K: 0.5933, L: 0.5104, M: 0.8403, N: 0.6843, O: 0.7233, P: 0.6038, Q: 0.7233, R: 0.6303, S: 0.6306, T: 0.6533, U: 0.7018,
    V: 0.6033, W: 0.9353, X: 0.6058, Y: 0.5853, Z: 0.6139, a: 0.5553, b: 0.5919, c: 0.5391, d: 0.5924, e: 0.5843, f: 0.3312,
    g: 0.5919, h: 0.5938, i: 0.2334, j: 0.2504, k: 0.4958, l: 0.2334, m: 0.8478, n: 0.5938, o: 0.5913, p: 0.5919, q: 0.5924,
    r: 0.3604, s: 0.5249, t: 0.3707, u: 0.5938, v: 0.5079, w: 0.7673, x: 0.5269, y: 0.5273, z: 0.5293, '·': 0.2264, '#': 0.9202,
    '-': 0.2699, '.': 0.2535, '/': 0.2544, '(': 0.4259, ')': 0.4259,
  },
  560: {
    '0': 0.6304, '1': 0.4105, '2': 0.5785, '3': 0.563, '4': 0.5931, '5': 0.577, '6': 0.616, '7': 0.5292, '8': 0.5925, '9': 0.616,
    ' ': 0.1949, A: 0.6808, B: 0.6175, C: 0.7224, D: 0.682, E: 0.573, F: 0.509, G: 0.7144, H: 0.6995, I: 0.2535, J: 0.4785,
    K: 0.6169, L: 0.5175, M: 0.8435, N: 0.697, O: 0.732, P: 0.6175, Q: 0.732, R: 0.6415, S: 0.6473, T: 0.654, U: 0.7065,
    V: 0.6185, W: 0.9519, X: 0.6275, Y: 0.6099, Z: 0.6355, a: 0.5615, b: 0.5999, c: 0.5463, d: 0.6005, e: 0.589, f: 0.362,
    g: 0.5999, h: 0.606, i: 0.2535, j: 0.2655, k: 0.5135, l: 0.2535, m: 0.8699, n: 0.606, o: 0.6009, p: 0.5999, q: 0.6005,
    r: 0.376, s: 0.529, t: 0.413, u: 0.606, v: 0.527, w: 0.781, x: 0.5365, y: 0.5395, z: 0.527, '·': 0.243, '#': 0.9209,
    '-': 0.415, '.': 0.275, '/': 0.2735, '(': 0.4355, ')': 0.4355,
  },
};

/** what kerning can add to a summed width, in units */
const KERNING_ALLOWANCE = 1.5;

/** the drawn width of a line of text, rounded up by what kerning can add; throws on a glyph not measured */
export function textWidth(text: string, sizePx: number, weight: 400 | 560): number {
  const table = ADVANCE_EM[weight];
  let em = 0;
  for (const glyph of text) {
    const advance = table[glyph];
    if (advance === undefined) throw new Error(`[manropeAdvances] no advance measured for ${JSON.stringify(glyph)}: measure it and add it`);
    em += advance;
  }
  return em * sizePx + KERNING_ALLOWANCE;
}
