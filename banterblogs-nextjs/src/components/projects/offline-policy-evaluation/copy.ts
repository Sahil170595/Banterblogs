import { ACTIONS, CONTEXTS, loggingPolicy, type Config } from '@/lib/projects/offline-policy-evaluation/engine';

// The demo's plain words, computed from the generator so they cannot drift
// from what it logs. No client hooks: the page can read them too.

const PERCENT = 100;
const INTENSIFY = ACTIONS.indexOf('Intensify');

export const SUPPORT_LABEL: Record<Config['scenario'], string> = { balanced: 'Broad', rare: 'Rare', gap: 'None at low load' };

/** how often the logger chose Intensify at each load, read off loggingPolicy */
export function supportNote(scenario: Config['scenario']): string {
  const [first, ...rest] = CONTEXTS.map((name, context) => ({
    share: `${Math.round(loggingPolicy(context, scenario)[INTENSIFY] * PERCENT)}%`,
    load: name.toLowerCase(),
  }));
  const others = rest.map(({ share, load }) => `${share} at ${load}`);
  const tail = `${others.slice(0, -1).join(', ')} and ${others[others.length - 1]}`;
  return `${SUPPORT_LABEL[scenario]}: the logger chose ${ACTIONS[INTENSIFY]} ${first.share} of the time at ${first.load}, ${tail}.`;
}
