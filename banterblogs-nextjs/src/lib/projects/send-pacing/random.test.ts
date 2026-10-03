import { describe, expect, it } from 'vitest';
import { randomState } from './random';

// NumPy 2.2.6's np.random.RandomState(seed) printed these, in this order;
// the gauss cache, the gamma rejection loop and the masked integers all
// depend on drawing in the same sequence.

type Draw = [string, number];
const EXPECTED: Record<number, Draw[]> = {
  7: [
    ['random', 0.07630828937395717],
    ['normal', 45.190951175834364],
    ['random', 0.7234651778309412],
    ['normal', 262.27498117202595],
    ['normal', 5.907629462145192],
    ['exponential', 8.692382781436162],
    ['gamma', 67.50197923864478],
    ['gamma', 49.96552343126757],
    ['uniform', 54.112171083131265],
    ['randint', 13],
    ['choice2', 0],
    ['choice4', 45],
    ['uniform', 4855.179045160474],
    ['normal', -35.094486126908414],
    ['randint', 15],
    ['randint', 12],
    ['randint', 13],
    ['random', 0.2133853535799155],
  ],
  0: [
    ['random', 0.5488135039273248],
    ['normal', 61.123876112137424],
    ['random', 0.5448831829968969],
    ['normal', 279.52446994430693],
    ['normal', 336.16043822699413],
    ['exponential', 7.1939899896079975],
    ['gamma', 20.8975933366483],
    ['gamma', 46.10794589627899],
    ['uniform', 45.866847592587135],
    ['randint', 9],
    ['choice2', 1],
    ['choice4', 15],
    ['uniform', 6019.767097469118],
    ['normal', 8.211970038767447],
    ['randint', 9],
    ['randint', 10],
    ['randint', 13],
    ['random', 0.02021839744032572],
  ],
  4294967295: [
    ['random', 0.0976320289940138],
    ['normal', 51.219555021759035],
    ['random', 0.14611715599393837],
    ['normal', 73.7433222026698],
    ['normal', 20.499792573900788],
    ['exponential', 52.13132442852876],
    ['gamma', 91.69264324726919],
    ['gamma', 20.661369521618692],
    ['uniform', 54.71640217823248],
    ['randint', 15],
    ['choice2', 1],
    ['choice4', 0],
    ['uniform', 2301.1321416862925],
    ['normal', -10.918454281031247],
    ['randint', 10],
    ['randint', 12],
    ['randint', 13],
    ['random', 0.24708304292046157],
  ],
};

describe('the RandomState port', () => {
  for (const [seed, draws] of Object.entries(EXPECTED)) {
    it(`draws what NumPy draws for seed ${seed}`, () => {
      const r = randomState(Number(seed));
      // the arguments the Python script passed, in its order
      const normalArgs = [
        [50, 15],
        [0, 180],
        [0, 180],
        [0, 20],
      ];
      const uniformArgs = [
        [30, 60],
        [0, 7200.0],
      ];
      let normals = 0;
      let uniforms = 0;
      const got = draws.map(([kind]) => {
        switch (kind) {
          case 'random':
            return r.random();
          case 'normal': {
            const [loc, scale] = normalArgs[normals++];
            return r.normal(loc, scale);
          }
          case 'exponential':
            return r.exponential(12.5);
          case 'gamma':
            return r.gamma(2, 30);
          case 'uniform': {
            const [low, high] = uniformArgs[uniforms++];
            return r.uniform(low, high);
          }
          case 'randint':
            return r.randint(9, 17);
          case 'choice2':
            return r.randint(0, 2);
          case 'choice4':
            return [0, 15, 30, 45][r.randint(0, 4)];
          default:
            throw new Error(kind);
        }
      });
      got.forEach((value, i) => expect(value, `${draws[i][0]} #${i}`).toBe(draws[i][1]));
    });
  }
});
