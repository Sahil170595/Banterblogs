import type { ComponentProps, ReactElement } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StreamingLadder } from '../StreamingLadder';
import { BftConsensus } from '../BftConsensus';
import { CognitiveAgents } from '../CognitiveAgents';
import { ProvenanceChain } from '../ProvenanceChain';
import ladderData from '@/data/scenes/streaming-ladder.json';
import bftData from '@/data/scenes/bft-consensus.json';
import cognitiveData from '@/data/scenes/cognitive-agents.json';
import provenanceData from '@/data/scenes/provenance-chain.json';

// Reduced motion keeps every scene from autoplaying, so the only selection
// changes are the key presses under test.
beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'matchMedia');
});

const radiosIn = (group: string) => within(screen.getByRole('radiogroup', { name: group })).getAllByRole('radio');
const checkedIndex = (radios: HTMLElement[]) => radios.findIndex((r) => r.getAttribute('aria-checked') === 'true');

// Tab lands on the group's single tab stop; returns its index.
function tabInto(group: string): number {
  const radios = radiosIn(group);
  const stop = radios.filter((r) => r.tabIndex === 0);
  expect(stop).toHaveLength(1);
  stop[0].focus();
  return radios.indexOf(stop[0]);
}

// keydown on the focused radio bubbles to the group's handler, as in a browser
const press = (key: string) => fireEvent.keyDown(document.activeElement ?? document.body, { key });

function expectFocusOnChecked(group: string): number {
  const radios = radiosIn(group);
  const checked = checkedIndex(radios);
  expect(checked).toBeGreaterThanOrEqual(0);
  expect(document.activeElement).toBe(radios[checked]);
  expect(radios[checked].tabIndex).toBe(0);
  return checked;
}

describe('StreamingLadder scenario picker', () => {
  const GROUP = 'Reasoning step scenarios';

  it('reaches every scenario with the arrow keys, focus following the selection', () => {
    render(<StreamingLadder data={ladderData} />);
    const count = radiosIn(GROUP).length;
    const visited = new Set([tabInto(GROUP)]);

    for (let i = 1; i < count; i += 1) {
      press('ArrowRight');
      visited.add(expectFocusOnChecked(GROUP));
    }

    expect(visited.size).toBe(count);
  });

  it('wraps backwards and jumps with Home and End', () => {
    render(<StreamingLadder data={ladderData} />);
    const count = radiosIn(GROUP).length;
    tabInto(GROUP);

    press('Home');
    expect(expectFocusOnChecked(GROUP)).toBe(0);
    press('ArrowLeft');
    expect(expectFocusOnChecked(GROUP)).toBe(count - 1);
    press('Home');
    press('End');
    expect(expectFocusOnChecked(GROUP)).toBe(count - 1);
  });
});

type SceneCase = [name: string, scene: () => ReactElement, scenarioGroup: string];

const SCENES: SceneCase[] = [
  ['BftConsensus', () => <BftConsensus data={bftData as unknown as ComponentProps<typeof BftConsensus>['data']} />, 'BFT scenarios'],
  [
    'CognitiveAgents',
    () => <CognitiveAgents data={cognitiveData as unknown as ComponentProps<typeof CognitiveAgents>['data']} />,
    'Task scenarios',
  ],
  [
    'ProvenanceChain',
    () => <ProvenanceChain data={provenanceData as unknown as ComponentProps<typeof ProvenanceChain>['data']} />,
    'Event timeline',
  ],
];

describe.each(SCENES)('%s radio groups', (_name, scene, scenarioGroup) => {
  it('moves focus to the newly checked scenario', () => {
    render(scene());
    const count = radiosIn(scenarioGroup).length;
    const start = tabInto(scenarioGroup);

    press('ArrowDown');
    expect(expectFocusOnChecked(scenarioGroup)).toBe((start + 1) % count);
    press('End');
    expect(expectFocusOnChecked(scenarioGroup)).toBe(count - 1);
  });

  it('moves focus to the newly checked beat', () => {
    render(scene());
    const start = tabInto('Beat selector');

    press('ArrowRight');
    expect(expectFocusOnChecked('Beat selector')).toBe(start + 1);
  });
});
